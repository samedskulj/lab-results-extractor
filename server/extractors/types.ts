import type { Answer, AskRequest, Commentary, CommentaryResult, Explanation, Letter, RawExtraction } from "../../shared/types.ts";

/** Both the Claude extractor and the rule-based baseline implement this, so the pipeline and evals treat them the same. */
export interface Extractor {
  extract(document: string): Promise<RawExtraction>;
  comment(results: CommentaryResult[]): Promise<Commentary>;
  explain(results: CommentaryResult[]): Promise<Explanation>;
  ask(results: CommentaryResult[], question: string, history: AskRequest["history"]): Promise<Answer>;
  letter(results: CommentaryResult[], patientName: string | null): Promise<Letter>;
}

export const isAbnormal = (r: Pick<CommentaryResult, "flag">) => r.flag !== "normal" && r.flag !== "unknown";
export const isCritical = (r: Pick<CommentaryResult, "flag">) => r.flag.startsWith("critical");
