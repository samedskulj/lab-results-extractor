import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { z } from "zod";

/** Small and fast: reading, summarising and drafting from checked values doesn't need a larger model. */
const DEFAULT_MODEL = "claude-haiku-5-5";
const CACHE_DIR = process.env.VERCEL ? path.join(tmpdir(), ".llm-cache") : path.resolve(".llm-cache");

export type Effort = "low" | "medium" | "high";

export class LlmError extends Error {
  override name = "LlmError";
}

export const model = (): string => process.env.AI_MODEL ?? DEFAULT_MODEL;

/** True when the server has credentials for the AI service. */
export const isLive = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client: Anthropic | undefined;
const getClient = (): Anthropic => {
  if (!isLive()) throw new LlmError("The AI assistant isn't set up on this server: ANTHROPIC_API_KEY is missing.");
  return (client ??= new Anthropic());
};

/** A document the AI should read directly: a photo or a PDF. */
export interface FileInput {
  media_type: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  /** Base64, no data: prefix. */
  data: string;
}

const fileBlock = ({ media_type, data }: FileInput): Anthropic.ContentBlockParam =>
  media_type === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type, data } }
    : { type: "image", source: { type: "base64", media_type, data } };

function refusedOrCutOff(stopReason: string | null) {
  if (stopReason === "refusal") throw new LlmError("The AI assistant declined this request.");
  if (stopReason === "max_tokens") throw new LlmError("The AI assistant's response was cut off. Try a shorter document.");
}

export interface StructuredRequest<T> {
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  effort?: Effort;
}

/**
 * One AI call that must return data matching `schema`.
 * Structured outputs guarantee the JSON shape; Zod re-validates it on the way in.
 * Responses are cached on disk by request hash so repeated requests and evals replay deterministically.
 */
export async function generateStructured<T>({ schema, system, prompt, effort = "low" }: StructuredRequest<T>): Promise<T> {
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
  });

  refusedOrCutOff(response.stop_reason);
  if (!response.parsed_output) throw new LlmError("The AI assistant's response did not match the expected format.");

  await writeCache(key, response.parsed_output);
  return response.parsed_output;
}

/** Read a photo or PDF and return its text, as printed. Not cached: the file may be a patient record. */
export async function readFromFile(file: FileInput, system: string, instruction: string): Promise<string> {
  const response = await getClient().messages.create({
    model: model(),
    max_tokens: 16000,
    system,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: [fileBlock(file), { type: "text", text: instruction }] }],
  });

  refusedOrCutOff(response.stop_reason);
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
  if (!text) throw new LlmError("The AI assistant couldn't read any text in this file.");
  return text;
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
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(value, null, 2));
  } catch {
    /* read-only filesystem (serverless): the cache is an optimisation, never a failure */
  }
}
