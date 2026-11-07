import { useEffect, useMemo, useRef } from "react";
import type { NormalisedResult } from "../../shared/types.ts";
import { groupOf } from "../format.ts";

interface Span {
  start: number;
  end: number;
  index: number;
}

/** Find each quote in the document (exact, then case-insensitive), skipping overlaps. */
export function locate(text: string, quotes: string[]): Span[] {
  const lower = text.toLowerCase();
  const spans = quotes
    .map((q, index) => {
      if (!q) return null;
      let start = text.indexOf(q);
      if (start === -1) start = lower.indexOf(q.toLowerCase());
      return start === -1 ? null : { start, end: start + q.length, index };
    })
    .filter((s) => s !== null)
    .sort((a, b) => a.start - b.start);
  return spans.filter((s, i) => i === 0 || s.start >= (spans[i - 1]?.end ?? 0));
}

/**
 * The original document, marked up like a reviewed paper report: every value the system
 * read is underlined by severity, and the selected one is registered and scrolled into view.
 */
export function TopSheet({
  text,
  results,
  active,
  onSelect,
}: {
  text: string;
  results: NormalisedResult[];
  active: number | null;
  onSelect: (index: number) => void;
}) {
  const activeRef = useRef<HTMLElement>(null);
  const spans = useMemo(() => locate(text, results.map((r) => r.evidence)), [text, results]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active]);

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const span of spans) {
    parts.push(text.slice(cursor, span.start));
    const result = results[span.index]!;
    const isActive = span.index === active;
    parts.push(
      <mark
        key={span.start}
        ref={isActive ? activeRef : undefined}
        className={`mark mark-${groupOf(result)}${isActive ? " is-active" : ""}`}
        onClick={() => onSelect(span.index)}
        title={`${result.name}: ${result.value ?? "?"} ${result.unit}`}
      >
        {text.slice(span.start, span.end)}
      </mark>,
    );
    cursor = span.end;
  }
  parts.push(text.slice(cursor));

  return <pre className="sheet-text">{parts}</pre>;
}
