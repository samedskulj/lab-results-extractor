import { describe, expect, it } from "vitest";
import { findConverter, normaliseUnit } from "../shared/catalogue.ts";
import type { RawResult } from "../shared/types.ts";
import { flagValue, normaliseResult } from "./normalise.ts";

const raw = (overrides: Partial<RawResult>): RawResult => ({
  analyte_id: "glucose",
  name_as_written: "Glucose",
  value: 128,
  unit: "mg/dL",
  ref_low: 65,
  ref_high: 99,
  evidence: "Glucose, Fasting 128 mg/dL",
  ...overrides,
});
const DOC = "  Glucose, Fasting              128 mg/dL        65-99         H";

describe("units", () => {
  it("normalises unit spellings", () => {
    expect(normaliseUnit("x10^9/L")).toBe("10^9/l");
    expect(normaliseUnit("10*9/L")).toBe("10^9/l");
    expect(normaliseUnit("µmol/L")).toBe("umol/l");
    expect(normaliseUnit("mL/min/1.73m²")).toBe("ml/min/1.73m2");
  });

  it("converts conventional units to SI", () => {
    expect(findConverter("glucose", "mg/dL")?.(180.16)).toBeCloseTo(10);
    expect(findConverter("hba1c", "%")?.(6.4)).toBeCloseTo(46.4, 1);
    expect(findConverter("creatinine", "mg/dL")?.(1)).toBeCloseTo(88.42);
    expect(findConverter("sodium", "furlongs")).toBeUndefined();
  });
});

describe("flagValue", () => {
  it("checks critical thresholds before the reference range", () => {
    expect(flagValue("potassium", 6.4, 3.5, 5.3)).toBe("critical_high");
    expect(flagValue("potassium", 5.8, 3.5, 5.3)).toBe("high");
    expect(flagValue("potassium", 4.1, 3.5, 5.3)).toBe("normal");
    expect(flagValue("haemoglobin", 68, 115, 165)).toBe("critical_low");
    expect(flagValue("egfr", 39, 90, null)).toBe("low");
    expect(flagValue("crp", null, null, 5)).toBe("unknown");
  });
});

describe("normaliseResult", () => {
  it("converts value and printed range, then flags", () => {
    const r = normaliseResult(raw({}), DOC);
    expect(r).toMatchObject({ value: 7.1, unit: "mmol/L", ref_low: 3.61, ref_high: 5.5, range_source: "report", flag: "high" });
    expect(r.issues.map((i) => i.code)).toEqual(["converted"]);
    expect(r.needs_review).toBe(false);
  });

  it("falls back to the default range when none is printed", () => {
    const r = normaliseResult(raw({ unit: "mmol/L", value: 6.1, ref_low: null, ref_high: null, evidence: "glucose 6.1" }), "fasting glucose 6.1 today");
    expect(r).toMatchObject({ ref_low: 3.9, ref_high: 5.5, range_source: "default", flag: "high" });
  });

  it("flags quotes that are not in the document (hallucination guard)", () => {
    const r = normaliseResult(raw({ evidence: "Glucose 128 mg/dL (made up)" }), DOC);
    expect(r.issues.map((i) => i.code)).toContain("ungrounded");
    expect(r.needs_review).toBe(true);
  });

  it("flags a value that is not in its own quote", () => {
    const r = normaliseResult(raw({ value: 182 }), DOC);
    expect(r.issues.map((i) => i.code)).toContain("value_not_in_evidence");
  });

  it("flags implausible values, unknown units and missing units", () => {
    expect(normaliseResult(raw({ unit: "mmol/L" }), DOC).issues.map((i) => i.code)).toContain("implausible_value");
    expect(normaliseResult(raw({ unit: "bananas" }), DOC)).toMatchObject({ flag: "unknown", needs_review: true });
    const noUnit = normaliseResult(raw({ unit: "", value: 6.1, evidence: "glucose 6.1" }), "glucose 6.1");
    expect(noUnit.issues.map((i) => i.code)).toContain("assumed_unit");
  });

  it("passes unknown analytes through for review", () => {
    const r = normaliseResult(raw({ analyte_id: "unknown", name_as_written: "Lipase" }), DOC);
    expect(r).toMatchObject({ analyte_id: "unknown", name: "Lipase", flag: "unknown", needs_review: true });
  });
});
