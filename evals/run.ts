// Usage: npm run eval   (needs ANTHROPIC_API_KEY in .env; scores the AI reader against the hand-labelled golden set)
import { isLive, loadEnv } from "../server/lib/index.ts";
import { runEval } from "../server/eval.ts";

loadEnv();
if (!isLive()) {
  console.error("Add ANTHROPIC_API_KEY to .env to run the evaluation.");
  process.exit(1);
}

const pct = (n: number) => `${(n * 100).toFixed(0)}%`.padStart(5);
const report = await runEval();
console.log(`\nAI READER  (${report.elapsed_ms} ms)`);
console.log("sample                    recall  prec  value  flag");
for (const s of report.samples) {
  console.log(`${s.title.padEnd(24)} ${pct(s.recall)}  ${pct(s.precision)} ${pct(s.valueAccuracy)} ${pct(s.flagAccuracy)}`);
  for (const m of s.mistakes) console.log(`    - ${m}`);
}
const o = report.overall;
console.log(`${"OVERALL".padEnd(24)} ${pct(o.recall)}  ${pct(o.precision)} ${pct(o.valueAccuracy)} ${pct(o.flagAccuracy)}   (${o.expected} labelled results)`);
