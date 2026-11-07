import type { NormalisedResult } from "../../shared/types.ts";
import { displayName, groupOf, type GroupId } from "../format.ts";
import type { CaseDoc, CaseState } from "./useCases.ts";

export type StatusTone = GroupId | "new" | "busy" | "reviewed" | "error";

export interface CaseStatus {
  tone: StatusTone;
  label: string;
}

/** Worklist order: critical first, reviewed last. */
export const STATUS_RANK: Record<StatusTone, number> = { critical: 0, error: 1, outside: 2, check: 3, busy: 4, new: 5, normal: 6, reviewed: 7 };

export const countGroups = (results: NormalisedResult[]): Record<GroupId, number> => {
  const counts: Record<GroupId, number> = { critical: 0, outside: 0, check: 0, normal: 0 };
  for (const r of results) counts[groupOf(r)]++;
  return counts;
};

function fromCounts(n: Record<GroupId, number>): CaseStatus {
  if (n.critical) return { tone: "critical", label: `${n.critical} critical` };
  if (n.outside) return { tone: "outside", label: `${n.outside} outside range` };
  if (n.check) return { tone: "check", label: `${n.check} to check` };
  return { tone: "normal", label: "All in range" };
}

/** One honest line per case, for the worklist and sidebar. */
export function caseStatus(c: CaseState): CaseStatus {
  if (c.extraction.status === "idle") return { tone: "new", label: "New" };
  if (c.extraction.status === "loading") return { tone: "busy", label: "Analysing" };
  if (c.extraction.status === "error") return { tone: "error", label: "Couldn't analyse" };
  if (c.reviewed) return { tone: "reviewed", label: "Reviewed" };
  return fromCounts(countGroups(c.extraction.data?.results ?? []));
}

const patientOf = (c?: CaseState) => c?.extraction.data?.meta.patient_name ?? null;

/** Patient name once the document has been read, otherwise the document's own title. */
export const caseName = (doc: CaseDoc, c?: CaseState): string => displayName(patientOf(c)) ?? doc.title;
export const hasPatientName = (c?: CaseState): boolean => Boolean(patientOf(c));
