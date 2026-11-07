import type { RegionId } from "../shared/regions.ts";
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
  LetterResponse,
  Transcription,
  TranscribeRequest,
} from "../shared/types.ts";
import { ai, transcribe } from "./ai.ts";
import { normaliseResult } from "./normalise.ts";

const since = (started: number) => Math.round(performance.now() - started);

/** Photo or PDF to text. The text then goes through the same read, standardise, verify steps as any pasted document. */
export async function transcribeFile({ media_type, data, region }: TranscribeRequest): Promise<Transcription> {
  const started = performance.now();
  return { text: await transcribe({ media_type, data }, region), elapsed_ms: since(started) };
}

/** Read, standardise, verify. The eval harness scores exactly this. */
export async function extractResults(document: string, region: RegionId = "other"): Promise<Extraction> {
  const started = performance.now();
  const { results, ...meta } = await ai.extract(document, region);
  return {
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

export async function explain(results: CommentaryResult[]): Promise<ExplanationResponse> {
  const started = performance.now();
  const explanation = await ai.explain(results);
  return { explanation: groundExplanation(explanation, results), elapsed_ms: since(started) };
}

export async function ask(results: CommentaryResult[], question: string, history: AskRequest["history"]): Promise<AnswerResponse> {
  const started = performance.now();
  const answer = await ai.ask(results, question, history);
  return { answer: groundAnswer(answer, results), elapsed_ms: since(started) };
}

export async function draftLetter(results: CommentaryResult[], patientName: string | null): Promise<LetterResponse> {
  const started = performance.now();
  return { letter: await ai.letter(results, patientName), elapsed_ms: since(started) };
}

export async function summarise(results: CommentaryResult[]): Promise<CommentaryResponse> {
  const started = performance.now();
  const commentary = await ai.comment(results);
  return { commentary: groundCommentary(commentary, results), elapsed_ms: since(started) };
}
