import type {
  Answer,
  AnswerResponse,
  AskRequest,
  Commentary,
  CommentaryResponse,
  CommentaryResult,
  Explanation,
  ExplanationResponse,
  Extraction,
  ExtractorId,
  LetterResponse,
} from "../shared/types.ts";
import { baselineExtractor } from "./extractors/baseline.ts";
import { claudeExtractor } from "./extractors/claude.ts";
import type { Extractor } from "./extractors/types.ts";
import { normaliseResult } from "./normalise.ts";

const EXTRACTORS: Record<ExtractorId, Extractor> = { claude: claudeExtractor, baseline: baselineExtractor };

const since = (started: number) => Math.round(performance.now() - started);

/** Read, standardise, verify. The eval harness scores exactly this. */
export async function extractResults(document: string, extractorId: ExtractorId): Promise<Extraction> {
  const started = performance.now();
  const { results, ...meta } = await EXTRACTORS[extractorId].extract(document);
  return {
    extractor: extractorId,
    meta,
    results: results.map((r) => normaliseResult(r, document)),
    elapsed_ms: since(started),
  };
}

/** Drop any finding that cites a result we didn't extract. */
export function groundCommentary(commentary: Commentary, results: Pick<CommentaryResult, "analyte_id">[]): Commentary {
  const present = new Set(results.map((r) => r.analyte_id));
  return { ...commentary, findings: commentary.findings.filter((f) => f.analyte_ids.every((id) => present.has(id))) };
}

/**
 * Every explanation must cite at least one result, and only results we actually extracted.
 * An explanation or ruled-out item that cites anything else is dropped rather than shown unverified.
 */
export function groundExplanation(explanation: Explanation, results: Pick<CommentaryResult, "analyte_id">[]): Explanation {
  const present = new Set(results.map((r) => r.analyte_id));
  const grounded = (ids: string[]) => ids.length > 0 && ids.every((id) => present.has(id as CommentaryResult["analyte_id"]));
  return {
    ...explanation,
    explanations: explanation.explanations.filter((e) => grounded(e.analyte_ids)).slice(0, 4),
    ruled_out: explanation.ruled_out.filter((r) => grounded(r.analyte_ids)).slice(0, 3),
  };
}

/** Answers may only cite results that exist. */
export function groundAnswer(answer: Answer, results: Pick<CommentaryResult, "analyte_id">[]): Answer {
  const present = new Set(results.map((r) => r.analyte_id));
  return { ...answer, analyte_ids: answer.analyte_ids.filter((id) => present.has(id)) };
}

export async function explain(results: CommentaryResult[], extractorId: ExtractorId): Promise<ExplanationResponse> {
  const started = performance.now();
  const explanation = await EXTRACTORS[extractorId].explain(results);
  return { extractor: extractorId, explanation: groundExplanation(explanation, results), elapsed_ms: since(started) };
}

export async function ask(results: CommentaryResult[], question: string, history: AskRequest["history"], extractorId: ExtractorId): Promise<AnswerResponse> {
  const started = performance.now();
  const answer = await EXTRACTORS[extractorId].ask(results, question, history);
  return { extractor: extractorId, answer: groundAnswer(answer, results), elapsed_ms: since(started) };
}

export async function draftLetter(results: CommentaryResult[], patientName: string | null, extractorId: ExtractorId): Promise<LetterResponse> {
  const started = performance.now();
  return { extractor: extractorId, letter: await EXTRACTORS[extractorId].letter(results, patientName), elapsed_ms: since(started) };
}

export async function summarise(results: CommentaryResult[], extractorId: ExtractorId): Promise<CommentaryResponse> {
  const started = performance.now();
  const commentary = await EXTRACTORS[extractorId].comment(results);
  return { commentary: groundCommentary(commentary, results), elapsed_ms: since(started) };
}
