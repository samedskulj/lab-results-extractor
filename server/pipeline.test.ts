import { describe, expect, it } from "vitest";
import type { CommentaryResult, NormalisedResult } from "../shared/types.ts";
import { app } from "./app.ts";
import { scoreResults } from "./eval.ts";
import { parseLine, parseRange } from "./extractors/baseline.ts";
import { answerByRules, explainByRules, letterByRules } from "./extractors/rules.ts";
import { groundCommentary, groundExplanation } from "./pipeline.ts";

describe("baseline parser", () => {
  it("parses table, US and pipe-delimited lines", () => {
    expect(parseLine("Potassium                 5.8       mmol/L         (3.5 - 5.3)    H")).toMatchObject({
      analyte_id: "potassium", value: 5.8, unit: "mmol/L", ref_low: 3.5, ref_high: 5.3,
    });
    expect(parseLine("  HDL Cholesterol               38 mg/dL         >39           L")).toMatchObject({
      analyte_id: "hdl", value: 38, unit: "mg/dL", ref_low: 39, ref_high: null,
    });
    expect(parseLine("K|K+|6.4|mmol/L|3.5|5.3|HH")).toMatchObject({ analyte_id: "potassium", value: 6.4, unit: "mmol/L" });
    expect(parseLine("Comment: Suggest repeat U&E within 2 weeks.")).toBeNull();
  });

  it("does not confuse HbA1c with haemoglobin", () => {
    expect(parseLine("HbA1c   52   mmol/mol")?.analyte_id).toBe("hba1c");
  });

  it("parses range notations", () => {
    expect(parseRange("(115 - 165)")).toEqual([115, 165]);
    expect(parseRange("<5")).toEqual([null, 5]);
    expect(parseRange("(>90)")).toEqual([90, null]);
    expect(parseRange("none")).toEqual([null, null]);
  });
});

const result = (analyte_id: NormalisedResult["analyte_id"], value: number, flag: NormalisedResult["flag"]) =>
  ({ analyte_id, value, flag }) as NormalisedResult;

describe("scoreResults", () => {
  it("counts matches, value/flag accuracy, misses and extras", () => {
    const score = scoreResults(
      [result("glucose", 7.1, "high"), result("sodium", 150, "high"), result("sodium", 141, "normal")],
      [
        { analyte_id: "glucose", value: 128, unit: "mg/dL", flag: "high" },
        { analyte_id: "sodium", value: 141, unit: "mEq/L", flag: "normal" },
        { analyte_id: "crp", value: 3, unit: "mg/L", flag: "normal" },
      ],
    );
    expect(score).toMatchObject({ expected: 3, predicted: 3, matched: 2, correctValue: 1, correctFlag: 1 });
    expect(score.mistakes).toEqual(["Sodium: read 150, should be 141", "Sodium: flagged high, should be normal", "Missed CRP", "Extra result: Sodium 141"]);
  });
});

describe("groundCommentary", () => {
  it("drops findings that cite results we never extracted", () => {
    const grounded = groundCommentary(
      { summary: "", follow_up: [], findings: [{ analyte_ids: ["glucose"], text: "ok" }, { analyte_ids: ["tsh"], text: "invented" }] },
      [result("glucose", 7.1, "high")],
    );
    expect(grounded.findings.map((f) => f.text)).toEqual(["ok"]);
  });
});

describe("groundExplanation", () => {
  it("drops explanations and ruled-out items that cite missing results or nothing at all", () => {
    const grounded = groundExplanation(
      {
        headline: "",
        explanations: [
          { title: "kept", support: "strong", reasoning: "", analyte_ids: ["potassium"], to_confirm: [] },
          { title: "invented", support: "strong", reasoning: "", analyte_ids: ["potassium", "tsh"], to_confirm: [] },
          { title: "uncited", support: "weak", reasoning: "", analyte_ids: [], to_confirm: [] },
        ],
        ruled_out: [{ title: "thyroid", reason: "", analyte_ids: ["tsh"] }],
      },
      [result("potassium", 5.8, "high")],
    );
    expect(grounded.explanations.map((e) => e.title)).toEqual(["kept"]);
    expect(grounded.ruled_out).toEqual([]);
  });
});

describe("rule-based explain, ask and letter", () => {
  const r = (analyte_id: CommentaryResult["analyte_id"], value: number, flag: CommentaryResult["flag"]) =>
    ({ analyte_id, name: analyte_id, value, unit: "u", ref_low: 1, ref_high: 2, flag }) as CommentaryResult;
  const results = [r("potassium", 5.8, "high"), r("creatinine", 131, "high"), r("egfr", 39, "low"), r("tsh", 1.9, "normal")];

  it("finds known patterns and rules out the in-range ones", () => {
    const e = explainByRules(results);
    expect(e.explanations.map((x) => x.title)).toEqual(["Reduced kidney function", "Hyperkalaemia"]);
    expect(e.ruled_out.map((x) => x.title)).toEqual(["Thyroid disorder"]);
  });

  it("looks up named results and declines free questions", () => {
    expect(answerByRules(results, "What was the potassium?")).toMatchObject({ answerable: true, analyte_ids: ["potassium"] });
    expect(answerByRules(results, "Is this serious?").answerable).toBe(false);
  });

  it("drafts a letter that names the patient and every abnormal result", () => {
    const { body } = letterByRules(results, "JONES, Eleanor");
    expect(body.startsWith("Dear Eleanor,")).toBe(true);
    expect(body.match(/^- /gm)).toHaveLength(3);
  });
});

describe("API", () => {
  const post = (path: string, body: unknown) =>
    app.request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  it("lists samples", async () => {
    const res = await app.request("/api/samples");
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(5);
  });

  it("extracts with the baseline", async () => {
    const res = await post("/api/extract", { text: "Sodium 139 mmol/L (133 - 146)\nPotassium 5.8 mmol/L (3.5 - 5.3)", extractor: "baseline" });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.results.map((r: NormalisedResult) => r.flag)).toEqual(["normal", "high"]);
  });

  it("rejects invalid input and Claude without a key", async () => {
    expect((await post("/api/extract", { text: "short", extractor: "baseline" })).status).toBe(400);
    const prevKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    expect((await post("/api/extract", { text: "Sodium 139 mmol/L (133 - 146)", extractor: "claude" })).status).toBe(400);
    process.env.ANTHROPIC_API_KEY = prevKey;
  });
});
