import { generateStructured } from "../lib/index.ts";
import {
  AnswerSchema,
  CommentarySchema,
  ExplanationSchema,
  LetterSchema,
  RawExtractionSchema,
  type CommentaryResult,
} from "../../shared/types.ts";
import type { Extractor } from "./types.ts";

const EXTRACT_SYSTEM = `You extract laboratory test results from clinical documents: lab reports, LIS exports, referral letters and OCR'd scans.

Rules:
- Extract every current result. Skip historical values quoted for comparison (e.g. "down from 141 in January").
- Map each result to an analyte_id. Use "unknown" when it is not in the list; never force a match.
- value, ref_low and ref_high are numbers exactly as reported, in the reported unit. Never convert units or do arithmetic; downstream code does that.
- "<5" means ref_high 5 and ref_low null; ">90" means ref_low 90 and ref_high null. Use null when no range is printed.
- unit: the reported unit with obvious OCR errors fixed ("mmo1/L" -> "mmol/L", "x1O^9/L" -> "x10^9/L"); empty string if no unit is given.
- evidence: a short quote copied character for character from the document, including any typos or OCR errors, that contains the test name and its value.
- Patient details: copy as written, null if absent. Never guess.`;

const COMMENT_SYSTEM = `You write a short commentary on normalised lab results for a busy GP. This is decision support, not a diagnosis.
- Use only the results given. Quote values with units and the reference range; never invent results.
- Critical values first, then other abnormal results, grouping related ones (e.g. iron studies, renal function, lipids).
- Follow-up suggestions are pragmatic considerations (repeat tests, review medication, referral), not diagnoses.`;

const resultsForPrompt = (results: CommentaryResult[]) =>
  JSON.stringify(
    results
      .filter((r) => r.analyte_id !== "unknown" && r.value !== null)
      .map(({ analyte_id, name, value, unit, ref_low, ref_high, flag }) => ({ analyte_id, name, value, unit, ref_low, ref_high, flag })),
    null,
    1,
  );

const EXPLAIN_SYSTEM = `You help a GP interpret a set of normalised lab results. This is decision support, not a diagnosis.
- Use only the results given. Never assume symptoms, history, age or sex that are not provided.
- Explanations: the most likely explanations for the abnormal pattern, most likely first, at most four. Group related results (e.g. iron studies, renal function, thyroid). Each cites every result it rests on by analyte_id and quotes values with units.
- support: "strong" only when several results agree or one result is unambiguous; "weak" when it rests on a borderline value or needs history to judge.
- to_confirm: pragmatic checks (repeat test, specific additional test, medication review), not treatments.
- ruled_out: at most three plausible alternatives that in-range results argue against, citing those results. Leave it empty if nothing fits.
- If every result is in range, return no explanations and say so in the headline.`;

const ASK_SYSTEM = `You answer a GP's questions about one patient's normalised lab results. This is decision support, not a diagnosis.
- Use only the results given and the earlier questions. Quote values with units and reference ranges.
- Be direct and brief: one to four sentences. Cite every result you rely on by analyte_id.
- If the results cannot answer the question (it needs history, imaging, other tests), set answerable to false and say what would be needed.`;

const LETTER_SYSTEM = `You draft a short letter from a GP to their patient explaining recent blood test results. The GP will edit and approve it before it is sent.
- Plain English at a reading age of about 11. Short sentences. No jargon; when a test name is needed, say what it measures in a few words.
- Use only the results given. Mention every result outside its range; summarise the in-range ones in one sentence.
- Calm and honest. Never diagnose; say what the result may mean and what happens next as possibilities the doctor will discuss.
- If a result is critical, say clearly that the surgery will contact them today and they should not wait.
- Start with "Dear <first name>," (or "Dear patient," if no name). End with "Best wishes," then "[Doctor's name]" on its own line.
- About 150 to 250 words.`;

export const claudeExtractor: Extractor = {
  extract: (document) =>
    generateStructured({
      schema: RawExtractionSchema,
      system: EXTRACT_SYSTEM,
      prompt: `<document>\n${document}\n</document>`,
      effort: "medium",
    }),

  comment: (results) =>
    generateStructured({
      schema: CommentarySchema,
      system: COMMENT_SYSTEM,
      prompt: `<results>\n${resultsForPrompt(results)}\n</results>`,
      effort: "low",
    }),

  explain: (results) =>
    generateStructured({
      schema: ExplanationSchema,
      system: EXPLAIN_SYSTEM,
      prompt: `<results>\n${resultsForPrompt(results)}\n</results>`,
      effort: "medium",
    }),

  ask: (results, question, history) =>
    generateStructured({
      schema: AnswerSchema,
      system: ASK_SYSTEM,
      prompt: [
        `<results>\n${resultsForPrompt(results)}\n</results>`,
        ...history.map((h) => `<earlier_question>${h.question}</earlier_question>\n<earlier_answer>${h.answer}</earlier_answer>`),
        `<question>${question}</question>`,
      ].join("\n"),
      effort: "low",
    }),

  letter: (results, patientName) =>
    generateStructured({
      schema: LetterSchema,
      system: LETTER_SYSTEM,
      prompt: `<patient_name>${patientName ?? "unknown"}</patient_name>\n<results>\n${resultsForPrompt(results)}\n</results>`,
      effort: "low",
    }),
};
