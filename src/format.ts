import { Check, ChevronDown, ChevronsDown, ChevronsUp, ChevronUp, CircleHelp, type LucideIcon } from "lucide-react";
import type { ExtractorId, Flag, IssueCode, NormalisedResult, Support } from "../shared/types.ts";

export type GroupId = "critical" | "outside" | "check" | "normal";

/** Flags carry shape as well as colour, so they read without colour vision. */
export const FLAG_DISPLAY: Record<Flag, { label: string; group: GroupId; Icon: LucideIcon }> = {
  critical_high: { label: "Critical high", group: "critical", Icon: ChevronsUp },
  critical_low: { label: "Critical low", group: "critical", Icon: ChevronsDown },
  high: { label: "High", group: "outside", Icon: ChevronUp },
  low: { label: "Low", group: "outside", Icon: ChevronDown },
  normal: { label: "In range", group: "normal", Icon: Check },
  unknown: { label: "Not flagged", group: "check", Icon: CircleHelp },
};

export const GROUPS: { id: GroupId; title: string; short: string }[] = [
  { id: "critical", title: "Critical", short: "Critical" },
  { id: "outside", title: "Outside reference range", short: "Outside range" },
  { id: "check", title: "Check against the original", short: "To check" },
  { id: "normal", title: "Within range", short: "In range" },
];

export function groupOf(r: NormalisedResult): GroupId {
  const group = FLAG_DISPLAY[r.flag].group;
  return group === "normal" && r.needs_review ? "check" : group;
}

/** Plain-language versions of the pipeline's checks. */
export const ISSUE_TEXT: Record<IssueCode, (r: NormalisedResult) => string> = {
  converted: (r) => `Converted from ${r.as_written.value ?? "?"} ${r.as_written.unit}.`,
  assumed_unit: (r) => `No unit on the report, so ${r.unit} was assumed. Check the original.`,
  ungrounded: () => "The quote for this value isn't in the document. Check it by hand.",
  value_not_in_evidence: () => "This number doesn't appear in its own quote. Check it by hand.",
  implausible_value: () => "Physiologically implausible: probably a reading error.",
  unknown_unit: (r) => `Unit "${r.as_written.unit}" isn't recognised, so it couldn't be standardised.`,
  unknown_analyte: () => "Not one of the 19 standard tests, so it's shown as written, without a range.",
  missing_value: () => "No number could be read for this test.",
};

export const formatRange = (low: number | null, high: number | null): string =>
  low !== null && high !== null ? `${low}–${high}` : low !== null ? `above ${low}` : high !== null ? `below ${high}` : "no range";

/**
 * Where to draw a value on a range bar. Every bar uses the same scale: the reference
 * range always spans the middle band, so "how far out" compares across tests.
 */
export function rangeGeometry(value: number | null, low: number | null, high: number | null) {
  if (value === null || (low === null && high === null)) return null;
  const clamp = (n: number) => Math.min(97, Math.max(3, n));
  if (low !== null && high !== null) return { band: [30, 70] as const, at: clamp(30 + (40 * (value - low)) / (high - low || 1)) };
  if (high !== null) return { band: [0, 70] as const, at: clamp((70 * value) / (high || 1)) };
  const l = low as number;
  return { band: [30, 100] as const, at: clamp(value < l ? (30 * value) / (l || 1) : 30 + (40 * (value - l)) / (l || 1)) };
}

export const ENGINE_NAME: Record<ExtractorId, string> = { claude: "AI", baseline: "Basic reader" };

export const SUPPORT_DISPLAY: Record<Support, { label: string; level: number }> = {
  strong: { label: "Strong support", level: 3 },
  moderate: { label: "Moderate support", level: 2 },
  weak: { label: "Weak support", level: 1 },
};

/** "JONES, Eleanor" -> "Eleanor Jones"; "Mr Daniel Okafor" -> "Daniel Okafor". */
export function displayName(name: string | null | undefined): string | null {
  if (!name) return null;
  const title = (s: string) => s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
  const clean = name.replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, "").trim();
  if (clean.includes(",")) {
    const [last, first] = clean.split(",").map((s) => s.trim());
    return title(`${first} ${last}`);
  }
  return clean === clean.toUpperCase() ? title(clean) : clean;
}

export const initials = (name: string | null): string =>
  name
    ? name
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

export const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export const pct = (n: number): string => `${Math.round(n * 100)}%`;

/** Small stable hash, used to remember review ticks per document. */
export function hashText(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
