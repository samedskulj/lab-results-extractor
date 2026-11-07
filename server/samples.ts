import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ANALYTE_IDS } from "../shared/catalogue.ts";
import type { Sample } from "../shared/types.ts";

const DIR = path.join(process.cwd(), "data", "samples");

const ManifestSchema = z.array(z.object({ id: z.string(), title: z.string(), description: z.string() }));

export const GoldenSchema = z.array(
  z.object({
    analyte_id: z.enum(ANALYTE_IDS),
    value: z.number(),
    unit: z.string(),
    flag: z.enum(["critical_low", "low", "normal", "high", "critical_high"]),
  }),
);
export type Golden = z.infer<typeof GoldenSchema>;

const read = (file: string) => readFile(path.join(DIR, file), "utf8");

export async function listSamples(): Promise<Sample[]> {
  const manifest = ManifestSchema.parse(JSON.parse(await read("samples.json")));
  return Promise.all(manifest.map(async (s) => ({ ...s, text: await read(`${s.id}.txt`) })));
}

export async function loadGolden(id: string): Promise<Golden> {
  return GoldenSchema.parse(JSON.parse(await read(`${id}.golden.json`)));
}
