import { ANALYTES, findConverter, roundValue, type AnalyteId } from "../shared/catalogue.ts";
import type { Counts, EvalReport, Metrics, NormalisedResult, SampleScore } from "../shared/types.ts";
import { extractResults } from "./pipeline.ts";
import { listSamples, loadGolden, type Golden } from "./samples.ts";

const nameOf = (id: AnalyteId | "unknown") => (id === "unknown" ? "an unknown test" : ANALYTES[id].name);
const flagText = (f: string) => f.replace("_", " ");

const ratio = (n: number, d: number) => (d === 0 ? 1 : n / d);

export const toMetrics = (c: Counts): Metrics => ({
  recall: ratio(c.matched, c.expected),
  precision: ratio(c.matched, c.predicted),
  valueAccuracy: ratio(c.correctValue, c.expected),
  flagAccuracy: ratio(c.correctFlag, c.expected),
});

const closeEnough = (a: number, b: number) => Math.abs(a - b) <= Math.max(Math.abs(b) * 0.01, 0.01);

/** Compare predictions with hand-labelled expectations. Golden values go through the same unit conversion. */
export function scoreResults(predicted: NormalisedResult[], golden: Golden): Counts & { mistakes: string[] } {
  const pool = predicted.filter((r) => r.analyte_id !== "unknown");
  const counts: Counts = { expected: golden.length, predicted: pool.length, matched: 0, correctValue: 0, correctFlag: 0 };
  const mistakes: string[] = [];

  for (const exp of golden) {
    const index = pool.findIndex((r) => r.analyte_id === exp.analyte_id);
    if (index === -1) {
      mistakes.push(`Missed ${nameOf(exp.analyte_id)}`);
      continue;
    }
    const [got] = pool.splice(index, 1);
    if (!got) continue;
    counts.matched++;

    const convert = findConverter(exp.analyte_id, exp.unit);
    const expectedValue = convert ? roundValue(convert(exp.value)) : exp.value;
    if (got.value !== null && closeEnough(got.value, expectedValue)) counts.correctValue++;
    else mistakes.push(`${nameOf(exp.analyte_id)}: read ${got.value ?? "nothing"}, should be ${expectedValue}`);

    if (got.flag === exp.flag) counts.correctFlag++;
    else mistakes.push(`${nameOf(exp.analyte_id)}: flagged ${flagText(got.flag)}, should be ${flagText(exp.flag)}`);
  }
  mistakes.push(...pool.map((r) => `Extra result: ${nameOf(r.analyte_id)} ${r.value ?? ""}`.trim()));
  return { ...counts, mistakes };
}

export async function runEval(): Promise<EvalReport> {
  const started = performance.now();
  const samples = await listSamples();

  const scores: SampleScore[] = await Promise.all(
    samples.map(async (sample) => {
      const [{ results }, golden] = await Promise.all([extractResults(sample.text), loadGolden(sample.id)]);
      const { mistakes, ...counts } = scoreResults(results, golden);
      return { sampleId: sample.id, title: sample.title, ...counts, ...toMetrics(counts), mistakes };
    }),
  );

  const total = scores.reduce<Counts>(
    (acc, s) => ({
      expected: acc.expected + s.expected,
      predicted: acc.predicted + s.predicted,
      matched: acc.matched + s.matched,
      correctValue: acc.correctValue + s.correctValue,
      correctFlag: acc.correctFlag + s.correctFlag,
    }),
    { expected: 0, predicted: 0, matched: 0, correctValue: 0, correctFlag: 0 },
  );

  return { samples: scores, overall: { ...total, ...toMetrics(total) }, elapsed_ms: Math.round(performance.now() - started) };
}
