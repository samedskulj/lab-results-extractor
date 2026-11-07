import { CircleHelp, CircleSlash, ListChecks, MessageSquareText, RotateCcw, SearchCheck } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Explanation, NormalisedResult } from "../../shared/types.ts";
import { groupOf, GROUPS, SUPPORT_DISPLAY } from "../format.ts";
import { Button, ErrorPanel, ResultChip, SourceTag } from "../ui/index.ts";
import type { CaseState } from "./useCases.ts";

type Lit = { kind: "cause"; i: number } | { kind: "result"; id: string } | null;
interface Thread {
  key: string;
  d: string;
  cause: number;
  id: string;
  tone: string;
  end: [number, number];
}

function SupportMeter({ support }: { support: Explanation["explanations"][number]["support"] }) {
  const { label, level } = SUPPORT_DISPLAY[support];
  return (
    <span className={`support support-${support}`}>
      <span className="support-bars" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= level ? "is-on" : ""} />
        ))}
      </span>
      {label}
    </span>
  );
}

const SEVERITY = Object.fromEntries(GROUPS.map((g, i) => [g.id, i]));

/**
 * Explain: ranked likely explanations, each visibly threaded to the results it rests on.
 * Hover or focus either end to light its threads; any result opens its source quote.
 */
export function ExplainStep({ c, onShowResult, onRetry, onAsk }: { c: CaseState; onShowResult: (i: number) => void; onRetry: () => void; onAsk: () => void }) {
  const results = c.extraction.data!.results;
  const { status, data, error, fellBack } = c.explanation;
  const explanation = data?.explanation;

  const indexOf = useCallback((id: string) => results.findIndex((r) => r.analyte_id === id), [results]);
  const resultOf = useCallback((id: string): NormalisedResult | undefined => results[indexOf(id)], [results, indexOf]);

  /** Results cited by any explanation, most severe first. */
  const cited = useMemo(() => {
    const ids = [...new Set(explanation?.explanations.flatMap((e) => e.analyte_ids) ?? [])];
    return ids
      .map((id) => resultOf(id))
      .filter((r): r is NormalisedResult => Boolean(r))
      .sort((a, b) => SEVERITY[groupOf(a)]! - SEVERITY[groupOf(b)]!);
  }, [explanation, resultOf]);

  /** Every abnormal result must show up on this page: cited by an explanation, or listed as not explained. */
  const unexplained = useMemo(() => {
    const covered = new Set<string>(explanation?.explanations.flatMap((e) => e.analyte_ids) ?? []);
    return results
      .filter((r) => (groupOf(r) === "critical" || groupOf(r) === "outside") && !covered.has(r.analyte_id))
      .sort((a, b) => SEVERITY[groupOf(a)]! - SEVERITY[groupOf(b)]!);
  }, [explanation, results]);

  const board = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLElement>());
  const cardRefs = useRef(new Map<number, HTMLElement>());
  const [threads, setThreads] = useState<Thread[]>([]);
  const [lit, setLit] = useState<Lit>(null);

  useLayoutEffect(() => {
    const el = board.current;
    if (!el || !explanation) return;
    const draw = () => {
      const box = el.getBoundingClientRect();
      const next: Thread[] = [];
      explanation.explanations.forEach((e, i) => {
        const card = cardRefs.current.get(i)?.getBoundingClientRect();
        if (!card) return;
        const x2 = card.left - box.left;
        const y2 = card.top - box.top + 30;
        e.analyte_ids.forEach((id) => {
          const chip = chipRefs.current.get(id)?.getBoundingClientRect();
          const r = resultOf(id);
          if (!chip || !r || chip.width === 0) return;
          const x1 = chip.right - box.left;
          const y1 = chip.top - box.top + chip.height / 2;
          const dx = Math.max(24, (x2 - x1) * 0.55);
          next.push({ key: `${i}-${id}`, d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`, cause: i, id, tone: groupOf(r), end: [x2, y2] });
        });
      });
      setThreads(next);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, [explanation, resultOf]);

  const isLit = (t: { cause: number; id: string }) => (lit?.kind === "cause" ? lit.i === t.cause : lit?.kind === "result" ? lit.id === t.id : false);
  const causeLit = (i: number, ids: string[]) => (lit?.kind === "cause" ? lit.i === i : lit?.kind === "result" ? ids.includes(lit.id) : false);
  const chipLit = (id: string) => (lit?.kind === "result" ? lit.id === id : lit?.kind === "cause" ? (explanation!.explanations[lit.i]!.analyte_ids as string[]).includes(id) : false);

  if (status === "loading" || status === "idle") {
    return (
      <section className="panel explain-loading" aria-busy="true" aria-live="polite">
        <p className="loading-text">Looking for patterns across {results.length} results…</p>
        <span className="skeleton tall" />
        <span className="skeleton tall" />
      </section>
    );
  }

  if (status === "error" || !explanation) {
    return (
      <ErrorPanel
        error={error}
        action={
          <Button variant="secondary" size="sm" icon={<RotateCcw size={14} aria-hidden />} onClick={onRetry}>
            Try again
          </Button>
        }
      />
    );
  }

  const engine = data?.extractor;

  return (
    <div className="stack explain">
      <section className="panel explain-head" aria-labelledby="explain-title">
        <h2 id="explain-title" className="ai-headline">
          {explanation.headline}
        </h2>
        <p className="ai-meta">
          <SourceTag engine={engine} fellBack={fellBack} />
          <span className="muted small">
            Ranked by how strongly these results alone support each one. Decision support, not a diagnosis: symptoms, history and examination aren&apos;t part of
            this.
          </span>
        </p>
      </section>

      {explanation.explanations.length === 0 ? (
        <section className="panel empty">
          <SearchCheck size={28} aria-hidden />
          <h2>No abnormal pattern to explain</h2>
          <p className="muted">Nothing in these results points to a specific cause. You can still ask a question about them.</p>
          <Button variant="ai" icon={<MessageSquareText size={16} aria-hidden />} onClick={onAsk}>
            Ask about these results
          </Button>
        </section>
      ) : (
        <section className="panel" aria-labelledby="threads-title">
          <header className="panel-head">
            <h2 id="threads-title">What each explanation rests on</h2>
            <span className="muted small">Select a result to see its source</span>
          </header>
          <div className="board" ref={board} onMouseLeave={() => setLit(null)}>
            <ul className="board-results" aria-label="Cited results">
              {cited.map((r) => (
                <li key={r.analyte_id} onMouseEnter={() => setLit({ kind: "result", id: r.analyte_id })}>
                  <ResultChip
                    r={r}
                    active={chipLit(r.analyte_id)}
                    onFocus={() => setLit({ kind: "result", id: r.analyte_id })}
                    onBlur={() => setLit(null)}
                    onClick={() => onShowResult(indexOf(r.analyte_id))}
                    ref={(el: HTMLButtonElement | null) => {
                      if (el) chipRefs.current.set(r.analyte_id, el);
                      else chipRefs.current.delete(r.analyte_id);
                    }}
                  />
                </li>
              ))}
            </ul>

            <svg className={`threads${lit ? " has-lit" : ""}`} aria-hidden>
              {threads.map((t) => (
                <path key={t.key} d={t.d} pathLength={1} className={`thread tone-${t.tone}${isLit(t) ? " is-lit" : ""}`} />
              ))}
              {[...new Map(threads.map((t) => [t.cause, t.end])).entries()].map(([cause, [x, y]]) => (
                <circle key={cause} cx={x} cy={y} r={4} className="thread-end" />
              ))}
            </svg>

            <ol className="board-causes">
              {explanation.explanations.map((e, i) => (
                <li
                  key={e.title}
                  ref={(el) => {
                    if (el) cardRefs.current.set(i, el);
                    else cardRefs.current.delete(i);
                  }}
                  className={`cause${i === 0 ? " is-lead" : ""}${causeLit(i, e.analyte_ids) ? " is-lit" : ""}${lit && !causeLit(i, e.analyte_ids) ? " is-dim" : ""}`}
                  onMouseEnter={() => setLit({ kind: "cause", i })}
                  onFocus={() => setLit({ kind: "cause", i })}
                >
                  <div className="cause-top">
                    <span className="cause-rank">{i + 1}</span>
                    <h3>{e.title}</h3>
                    <SupportMeter support={e.support} />
                  </div>
                  <p className="cause-why">{e.reasoning}</p>
                  <div className="cause-cites">
                    {e.analyte_ids.map((id) => {
                      const r = resultOf(id);
                      return r ? <ResultChip key={id} r={r} onClick={() => onShowResult(indexOf(id))} /> : null;
                    })}
                  </div>
                  {e.to_confirm.length > 0 && (
                    <div className="confirm">
                      <h4>
                        <ListChecks size={14} aria-hidden /> To confirm
                      </h4>
                      <ul>
                        {e.to_confirm.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
          {unexplained.length > 0 && (
            <div className="unexplained">
              <h3>
                <CircleHelp size={16} aria-hidden /> Not explained by these patterns
              </h3>
              <p className="muted small">Outside range, but no explanation above covers {unexplained.length === 1 ? "it" : "them"}. Review these yourself.</p>
              <div className="cause-cites">
                {unexplained.map((r) => (
                  <ResultChip key={r.analyte_id + r.evidence} r={r} onClick={() => onShowResult(results.indexOf(r))} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {explanation.ruled_out.length > 0 && (
        <section className="panel ruled-out" aria-labelledby="ruled-title">
          <header className="panel-head">
            <h2 id="ruled-title">
              <CircleSlash size={16} aria-hidden /> Less likely
            </h2>
            <span className="muted small">Considered, but in-range results argue against them</span>
          </header>
          <ul>
            {explanation.ruled_out.map((o) => (
              <li key={o.title}>
                <div>
                  <h3>{o.title}</h3>
                  <p>{o.reason}</p>
                </div>
                <div className="cause-cites">
                  {o.analyte_ids.map((id) => {
                    const r = resultOf(id);
                    return r ? <ResultChip key={id} r={r} onClick={() => onShowResult(indexOf(id))} /> : null;
                  })}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
