import { z } from "zod";
import { ANALYTE_IDS, type AnalyteId } from "./catalogue.ts";

export const ExtractorIdSchema = z.enum(["claude", "baseline"]);
export type ExtractorId = z.infer<typeof ExtractorIdSchema>;

/* ---------- What an extractor returns: values exactly as reported ---------- */

export const RawResultSchema = z.object({
  analyte_id: z
    .enum([...ANALYTE_IDS, "unknown"])
    .describe('Canonical analyte this result maps to, or "unknown" if it is not in the list'),
  name_as_written: z.string().describe("Test name exactly as printed"),
  value: z.number().nullable().describe("Numeric result as reported, in the reported unit. No conversion."),
  unit: z.string().describe('Reported unit with obvious OCR errors fixed, e.g. "mmo1/L" -> "mmol/L". Empty if none.'),
  ref_low: z.number().nullable().describe("Lower reference limit as printed, in the reported unit"),
  ref_high: z.number().nullable().describe("Upper reference limit as printed, in the reported unit"),
  evidence: z.string().describe("Short verbatim quote from the document containing the test name and value"),
});
export type RawResult = z.infer<typeof RawResultSchema>;

export const RawExtractionSchema = z.object({
  patient_name: z.string().nullable(),
  date_of_birth: z.string().nullable(),
  collected_on: z.string().nullable().describe("Sample collection date as written"),
  lab_name: z.string().nullable().describe("Laboratory, hospital or practice that issued the document"),
  results: z.array(RawResultSchema),
});
export type RawExtraction = z.infer<typeof RawExtractionSchema>;
export type ReportMeta = Omit<RawExtraction, "results">;

/* ---------- After deterministic normalisation and guardrails ---------- */

export type Flag = "critical_low" | "low" | "normal" | "high" | "critical_high" | "unknown";

export type IssueCode =
  | "unknown_analyte"
  | "unknown_unit"
  | "assumed_unit"
  | "missing_value"
  | "implausible_value"
  | "ungrounded"
  | "value_not_in_evidence"
  | "converted";

export interface Issue {
  code: IssueCode;
  severity: "info" | "warning" | "error";
  message: string;
}

export interface NormalisedResult {
  analyte_id: AnalyteId | "unknown";
  name: string;
  value: number | null;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  range_source: "report" | "default";
  flag: Flag;
  as_written: { name: string; value: number | null; unit: string };
  evidence: string;
  issues: Issue[];
  needs_review: boolean;
}

/* ---------- Commentary ---------- */

export const CommentarySchema = z.object({
  summary: z.string().describe("Two or three sentences for a busy GP"),
  findings: z
    .array(
      z.object({
        analyte_ids: z.array(z.enum(ANALYTE_IDS)).describe("Results this finding is based on"),
        text: z.string(),
      }),
    )
    .describe("Most important first; critical values always first"),
  follow_up: z.array(z.string()).describe("Pragmatic next steps phrased as considerations, not diagnoses"),
});
export type Commentary = z.infer<typeof CommentarySchema>;

/* ---------- API ---------- */

export interface Sample {
  id: string;
  title: string;
  description: string;
  text: string;
}

export const ExtractRequestSchema = z.object({
  text: z.string().trim().min(20, "Paste a lab report (at least 20 characters)").max(50_000),
  extractor: ExtractorIdSchema,
});

export const EvalRequestSchema = z.object({ extractor: ExtractorIdSchema });

/** Step 1-3 of the pipeline: read, standardise, verify. */
export interface Extraction {
  extractor: ExtractorId;
  meta: ReportMeta;
  results: NormalisedResult[];
  elapsed_ms: number;
}

/** The fields the summary may see: standardised values only, never the raw document. */
export const CommentaryResultSchema = z.object({
  analyte_id: z.enum([...ANALYTE_IDS, "unknown"]),
  name: z.string(),
  value: z.number().nullable(),
  unit: z.string(),
  ref_low: z.number().nullable(),
  ref_high: z.number().nullable(),
  flag: z.enum(["critical_low", "low", "normal", "high", "critical_high", "unknown"]),
});
export type CommentaryResult = z.infer<typeof CommentaryResultSchema>;

export const CommentaryRequestSchema = z.object({
  extractor: ExtractorIdSchema,
  results: z.array(CommentaryResultSchema).max(200),
});

/** Step 4, requested separately so the UI can show real progress. */
export interface CommentaryResponse {
  commentary: Commentary;
  elapsed_ms: number;
}

/* ---------- Explain: likely explanations for the pattern ---------- */

export const SupportSchema = z.enum(["strong", "moderate", "weak"]);
export type Support = z.infer<typeof SupportSchema>;

export const ExplanationSchema = z.object({
  headline: z.string().describe("One sentence on the overall picture, for a busy GP"),
  explanations: z
    .array(
      z.object({
        title: z.string().describe('Short name of the likely explanation, e.g. "Iron-deficiency anaemia"'),
        support: SupportSchema.describe("How strongly these results alone support it"),
        reasoning: z.string().describe("Two or three sentences linking the cited results to it, quoting values with units"),
        analyte_ids: z.array(z.enum(ANALYTE_IDS)).describe("Every result this explanation rests on (at least one)"),
        to_confirm: z.array(z.string()).describe("Tests or checks that would confirm or exclude it"),
      }),
    )
    .describe("Most likely first, at most four"),
  ruled_out: z
    .array(
      z.object({
        title: z.string(),
        reason: z.string().describe("Why these results argue against it, quoting values"),
        analyte_ids: z.array(z.enum(ANALYTE_IDS)).describe("Results that argue against it (at least one)"),
      }),
    )
    .describe("Plausible alternatives the results argue against, at most three"),
});
export type Explanation = z.infer<typeof ExplanationSchema>;

export interface ExplanationResponse {
  extractor: ExtractorId;
  explanation: Explanation;
  elapsed_ms: number;
}

/* ---------- Ask: questions answered from the results only ---------- */

export const AnswerSchema = z.object({
  answer: z.string().describe("Direct answer in one to four sentences, quoting values with units"),
  analyte_ids: z.array(z.enum(ANALYTE_IDS)).describe("Results the answer relies on"),
  answerable: z.boolean().describe("False when the results given cannot answer the question"),
});
export type Answer = z.infer<typeof AnswerSchema>;

export interface AnswerResponse {
  extractor: ExtractorId;
  answer: Answer;
  elapsed_ms: number;
}

/* ---------- Patient letter ---------- */

export const LetterSchema = z.object({
  subject: z.string().describe("Short subject line"),
  body: z.string().describe("The whole letter as plain text, paragraphs separated by a blank line"),
});
export type Letter = z.infer<typeof LetterSchema>;

export interface LetterResponse {
  extractor: ExtractorId;
  letter: Letter;
  elapsed_ms: number;
}

const ResultsPayload = z.array(CommentaryResultSchema).max(200);

export const ExplainRequestSchema = z.object({ extractor: ExtractorIdSchema, results: ResultsPayload });

export const AskRequestSchema = z.object({
  extractor: ExtractorIdSchema,
  results: ResultsPayload,
  question: z.string().trim().min(2, "Type a question").max(500),
  history: z.array(z.object({ question: z.string().max(500), answer: z.string().max(2000) })).max(10).default([]),
});
export type AskRequest = z.infer<typeof AskRequestSchema>;

export const LetterRequestSchema = z.object({
  extractor: ExtractorIdSchema,
  results: ResultsPayload,
  patient_name: z.string().max(200).nullable(),
});

export interface Counts {
  expected: number;
  predicted: number;
  matched: number;
  correctValue: number;
  correctFlag: number;
}

export interface Metrics {
  recall: number;
  precision: number;
  valueAccuracy: number;
  flagAccuracy: number;
}

export interface SampleScore extends Counts, Metrics {
  sampleId: string;
  title: string;
  mistakes: string[];
}

export interface EvalReport {
  extractor: ExtractorId;
  samples: SampleScore[];
  overall: Counts & Metrics;
  elapsed_ms: number;
}
