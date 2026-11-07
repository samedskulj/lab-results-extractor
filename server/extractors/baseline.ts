import { ANALYTES, findConverter, type AnalyteId } from "../../shared/catalogue.ts";
import type { Commentary, CommentaryResult, RawExtraction, RawResult } from "../../shared/types.ts";
import { answerByRules, explainByRules, letterByRules } from "./rules.ts";
import { isAbnormal, isCritical, type Extractor } from "./types.ts";

/**
 * Rule-based extractor: alias lookup + regexes, one result per line.
 * It's the "before" in the evals and lets the app run offline. Deliberately simple.
 */

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ALIASES = (Object.entries(ANALYTES) as [AnalyteId, (typeof ANALYTES)[AnalyteId]][])
  .flatMap(([id, a]) => a.aliases.map((alias) => ({ id, alias, re: new RegExp(`(?<![a-z0-9])${escape(alias)}(?![a-z0-9])`) })))
  .sort((a, b) => b.alias.length - a.alias.length);

const NUMBER = /\d+(?:\.\d+)?/;
const num = (s: string | undefined) => (s === undefined ? null : Number(s));

export function parseRange(text: string): [number | null, number | null] {
  const between = text.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (between) return [num(between[1]), num(between[2])];
  const below = text.match(/<\s*(\d+(?:\.\d+)?)/);
  if (below) return [null, num(below[1])];
  const above = text.match(/>\s*(\d+(?:\.\d+)?)/);
  if (above) return [num(above[1]), null];
  return [null, null];
}

export function parseLine(line: string): RawResult | null {
  const lower = line.toLowerCase();
  for (const { id, alias, re } of ALIASES) {
    const match = re.exec(lower);
    if (!match) continue;

    const afterName = line.slice(match.index + alias.length);
    const valueMatch = NUMBER.exec(afterName);
    if (!valueMatch) return null;

    const afterValue = afterName.slice(valueMatch.index + valueMatch[0].length);
    const token = afterValue.split(/[\s|,;()[\]]+/).find(Boolean) ?? "";
    const unit = token && findConverter(id, token) ? token : "";
    const [ref_low, ref_high] = parseRange(afterValue.slice(afterValue.indexOf(token) + token.length));

    return {
      analyte_id: id,
      name_as_written: line.slice(match.index, match.index + alias.length),
      value: Number(valueMatch[0]),
      unit,
      ref_low,
      ref_high,
      evidence: line.trim(),
    };
  }
  return null;
}

const firstMatch = (text: string, re: RegExp) => text.match(re)?.[1]?.trim() ?? null;

export const baselineExtractor: Extractor = {
  async extract(document: string): Promise<RawExtraction> {
    return {
      patient_name: firstMatch(document, /patient(?: name)?\s*:\s*(.+?)(?:\s{2,}|$)/im),
      date_of_birth: firstMatch(document, /(?:dob|d\.o\.b\.?|date of birth)\s*:?\s*([\d/.-]+)/i),
      collected_on: firstMatch(document, /(?:collected|collection date|taken)\s*:?\s*([\d/.-]+)/i),
      lab_name: document.split("\n").find((l) => l.trim())?.trim() ?? null,
      results: document.split("\n").map(parseLine).filter((r) => r !== null),
    };
  },

  async comment(results: CommentaryResult[]): Promise<Commentary> {
    const abnormal = results.filter(isAbnormal).sort((a, b) => Number(isCritical(b)) - Number(isCritical(a)));
    const describe = (r: CommentaryResult) =>
      `${r.name} is ${r.flag.replace("_", " ")} at ${r.value} ${r.unit} (ref ${r.ref_low ?? "–"}–${r.ref_high ?? "–"}).`;
    return {
      summary: `${abnormal.length} of ${results.length} results are outside the reference range.`,
      findings: abnormal.flatMap((r) => (r.analyte_id === "unknown" ? [] : [{ analyte_ids: [r.analyte_id], text: describe(r) }])),
      follow_up: [
        ...(abnormal.some(isCritical) ? ["Critical value present: contact the requesting clinician urgently."] : []),
        "Review flagged results in clinical context.",
      ],
    };
  },

  explain: async (results) => explainByRules(results),
  ask: async (results, question) => answerByRules(results, question),
  letter: async (results, patientName) => letterByRules(results, patientName),
};
