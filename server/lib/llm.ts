import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";

const DEFAULT_MODEL = "claude-opus-5-5";
/** Models that accept the server-side `fallbacks: "default"` refusal fallback. */
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);
const CACHE_DIR = path.resolve(".llm-cache");

export type Effort = "low" | "medium" | "high";

export class LlmError extends Error {
  override name = "LlmError";
}

export const model = (): string => process.env.CLAUDE_MODEL ?? DEFAULT_MODEL;

/** Live mode = we have credentials for the Claude API. Otherwise apps run their offline fallbacks. */
export const isLive = (): boolean =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client: Anthropic | undefined;
const getClient = (): Anthropic => (client ??= new Anthropic());

export interface StructuredRequest<T> {
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  effort?: Effort;
}

/**
 * One Claude call that must return data matching `schema`.
 * Structured outputs guarantee the JSON shape; Zod re-validates it on the way in.
 * Responses are cached on disk by request hash so demos and evals replay deterministically.
 */
export async function generateStructured<T>({
  schema,
  system,
  prompt,
  effort = "medium",
}: StructuredRequest<T>): Promise<T> {
  const format = betaZodOutputFormat(schema);
  const key = hash({ model: model(), system, prompt, effort, format });

  const cached = await readCache(key, schema);
  if (cached !== undefined) return cached;

  const response = await getClient().beta.messages.parse({
    model: model(),
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: { effort, format },
    ...(FALLBACK_MODELS.has(model())
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {}),
  });

  if (response.stop_reason === "refusal") throw new LlmError("Claude declined this request.");
  if (response.stop_reason === "max_tokens") throw new LlmError("Claude's response was cut off.");
  if (!response.parsed_output) throw new LlmError("Claude's response did not match the expected schema.");

  await writeCache(key, response.parsed_output);
  return response.parsed_output;
}

const cacheEnabled = (): boolean => process.env.LLM_CACHE !== "off";

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32);
}

async function readCache<T>(key: string, schema: z.ZodType<T>): Promise<T | undefined> {
  if (!cacheEnabled()) return undefined;
  try {
    const parsed = schema.safeParse(JSON.parse(await readFile(path.join(CACHE_DIR, `${key}.json`), "utf8")));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

async function writeCache(key: string, value: unknown): Promise<void> {
  if (!cacheEnabled()) return;
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(value, null, 2));
}
