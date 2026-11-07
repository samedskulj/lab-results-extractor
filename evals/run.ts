// Usage: npm run eval:lab -- [baseline|claude]   (defaults to both when a key is set)
import { isLive, loadEnv } from "../server/lib/index.ts";
import { runEval } from "../server/eval.ts";
import { ExtractorIdSchema, type ExtractorId } from "../shared/types.ts";

loadEnv();
const pct = (n: number) => `${(n * 100).toFixed(0)}%`.padStart(5);
const arg = process.argv[2];
const extractors: ExtractorId[] = arg ? [ExtractorIdSchema.parse(arg)] : isLive() ? ["baseline", "claude"] : ["baseline"];

for (const extractor of extractors) {
  const report = await runEval(extractor);
  console.log(`\n${extractor.toUpperCase()}  (${report.elapsed_ms} ms)`);
  console.log("sample                    recall  prec  value  flag");
  for (const s of report.samples) {
    console.log(`${s.title.padEnd(24)} ${pct(s.recall)}  ${pct(s.precision)} ${pct(s.valueAccuracy)} ${pct(s.flagAccuracy)}`);
    for (const m of s.mistakes) console.log(`    - ${m}`);
  }
  const o = report.overall;
  console.log(`${"OVERALL".padEnd(24)} ${pct(o.recall)}  ${pct(o.precision)} ${pct(o.valueAccuracy)} ${pct(o.flagAccuracy)}   (${o.expected} labelled results)`);
}
