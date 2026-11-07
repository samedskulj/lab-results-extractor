import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { NormalisedResult } from "../shared/types.ts";
import { app } from "./app.ts";
import { scoreResults } from "./eval.ts";
import { groundAnswer, groundCommentary, groundExplanation } from "./pipeline.ts";

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

describe("groundAnswer", () => {
  it("keeps only citations that exist", () => {
    expect(groundAnswer({ answer: "", answerable: true, analyte_ids: ["potassium", "tsh"] }, [result("potassium", 5.8, "high")]).analyte_ids).toEqual(["potassium"]);
  });
});

describe("API", () => {
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    app.request(path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.ANTHROPIC_API_KEY = "test-key";
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("answers the health check without signing in", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    expect((await app.request("/api/health")).status).toBe(200);
  });

  it("refuses AI routes without a sign-in when auth is configured", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    const res = await post("/api/extract", { text: "Sodium 139 mmol/L (133 - 146)" });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "signed_out" });
  });

  it("says plainly when the AI isn't set up", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    expect((await post("/api/extract", { text: "Sodium 139 mmol/L (133 - 146)" })).status).toBe(503);
  });

  it("rejects invalid input", async () => {
    expect((await post("/api/extract", { text: "short" })).status).toBe(400);
    expect((await post("/api/extract", { text: "Sodium 139 mmol/L (133 - 146)", region: "narnia" })).status).toBe(400);
    expect((await post("/api/transcribe", { media_type: "image/gif", data: "x".repeat(200) })).status).toBe(400);
  });
});
