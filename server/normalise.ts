import { findConverter, getAnalyte, roundValue, type AnalyteId } from "../shared/catalogue.ts";
import type { Flag, Issue, NormalisedResult, RawResult } from "../shared/types.ts";

type Bound = number | null;

/** Flag a canonical value: critical thresholds first, then the reference range. */
export function flagValue(id: AnalyteId, value: number | null, low: Bound, high: Bound): Flag {
  if (value === null) return "unknown";
  const [critLow, critHigh] = getAnalyte(id).critical ?? [null, null];
  if (critLow !== null && value < critLow) return "critical_low";
  if (critHigh !== null && value > critHigh) return "critical_high";
  if (low !== null && value < low) return "low";
  if (high !== null && value > high) return "high";
  return "normal";
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
const numbersIn = (s: string) => (s.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);

/** Guardrails against hallucination: the quote must exist in the document and contain the value. */
function groundingIssues(raw: RawResult, document: string): Issue[] {
  if (!squash(document).includes(squash(raw.evidence))) {
    return [{ code: "ungrounded", severity: "error", message: "Evidence quote not found in the document" }];
  }
  if (raw.value !== null && !numbersIn(raw.evidence).includes(raw.value)) {
    return [{ code: "value_not_in_evidence", severity: "error", message: `Value ${raw.value} does not appear in the quote` }];
  }
  return [];
}

/** Turn a raw extraction into the standard format: canonical units, ranges, flags and review issues. */
export function normaliseResult(raw: RawResult, document: string): NormalisedResult {
  const as_written = { name: raw.name_as_written, value: raw.value, unit: raw.unit };
  const issues = groundingIssues(raw, document);
  const finish = (r: Omit<NormalisedResult, "as_written" | "evidence" | "issues" | "needs_review">): NormalisedResult => ({
    ...r,
    as_written,
    evidence: raw.evidence,
    issues,
    needs_review: issues.some((i) => i.severity !== "info"),
  });

  if (raw.analyte_id === "unknown") {
    issues.push({ code: "unknown_analyte", severity: "warning", message: "Not in the analyte catalogue" });
    return finish({
      analyte_id: "unknown", name: raw.name_as_written, value: raw.value, unit: raw.unit,
      ref_low: raw.ref_low, ref_high: raw.ref_high, range_source: "report", flag: "unknown",
    });
  }

  const analyte = getAnalyte(raw.analyte_id);
  const convert = findConverter(raw.analyte_id, raw.unit);
  if (!convert) {
    issues.push({ code: "unknown_unit", severity: "error", message: `Can't convert "${raw.unit}" to ${analyte.unit}` });
    return finish({
      analyte_id: raw.analyte_id, name: analyte.name, value: raw.value, unit: raw.unit,
      ref_low: raw.ref_low, ref_high: raw.ref_high, range_source: "report", flag: "unknown",
    });
  }

  if (raw.unit.trim() === "") {
    issues.push({ code: "assumed_unit", severity: "warning", message: `No unit given; assumed ${analyte.unit}` });
  } else if (convert(1) !== 1) {
    issues.push({ code: "converted", severity: "info", message: `Converted from ${raw.value ?? "?"} ${raw.unit}` });
  }

  const toCanonical = (v: Bound) => (v === null ? null : roundValue(convert(v)));
  const value = toCanonical(raw.value);
  const fromReport = raw.ref_low !== null || raw.ref_high !== null;
  const [ref_low, ref_high] = fromReport ? [toCanonical(raw.ref_low), toCanonical(raw.ref_high)] : analyte.range;

  if (value === null) {
    issues.push({ code: "missing_value", severity: "warning", message: "No numeric value" });
  } else if (value < analyte.plausible[0] || value > analyte.plausible[1]) {
    issues.push({ code: "implausible_value", severity: "error", message: `${value} ${analyte.unit} is outside the plausible range` });
  }

  return finish({
    analyte_id: raw.analyte_id,
    name: analyte.name,
    value,
    unit: analyte.unit,
    ref_low,
    ref_high,
    range_source: fromReport ? "report" : "default",
    flag: flagValue(raw.analyte_id, value, ref_low, ref_high),
  });
}
