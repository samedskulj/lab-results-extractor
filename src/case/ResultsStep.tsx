import { ArrowRight, FileSearch, Siren } from "lucide-react";
import { Fragment, useEffect, useRef } from "react";
import type { NormalisedResult } from "../../shared/types.ts";
import { FLAG_DISPLAY, formatRange, groupOf, GROUPS, ISSUE_TEXT, rangeGeometry } from "../format.ts";
import { Button, ErrorPanel, FlagPill, SourceTag } from "../ui/index.ts";
import { countGroups } from "./status.ts";
import { TopSheet } from "./TopSheet.tsx";
import type { CaseState, Step } from "./useCases.ts";

export function RangeBar({ r }: { r: NormalisedResult }) {
  const geo = rangeGeometry(r.value, r.ref_low, r.ref_high);
  if (!geo) return <span className="range-bar is-empty" aria-hidden />;
  return (
    <span className="range-bar" aria-hidden>
      <span className="range-band" style={{ left: `${geo.band[0]}%`, width: `${geo.band[1] - geo.band[0]}%` }} />
      <span className={`range-dot tone-${groupOf(r)}`} style={{ left: `${geo.at}%` }} />
    </span>
  );
}

function Summary({ c, onStep }: { c: CaseState; onStep: (s: Step) => void }) {
  const { status, data, error } = c.summary;
  const results = c.extraction.data!.results;
  const counts = countGroups(results);
  const critical = results.map((r, i) => ({ r, i })).filter(({ r }) => groupOf(r) === "critical");

  return (
    <section className="panel summary" aria-label="Summary">
      <ul className="counts" aria-label="Results by status">
        {GROUPS.map((g) => (
          <li key={g.id} className={`count tone-${g.id}${counts[g.id] ? "" : " is-zero"}`}>
            <a href={`#group-${g.id}`} aria-disabled={!counts[g.id] || undefined} onClick={(e) => !counts[g.id] && e.preventDefault()}>
              <span className="count-n">{counts[g.id]}</span>
              <span className="count-label">{g.short}</span>
            </a>
          </li>
        ))}
      </ul>

      {critical.length > 0 && (
        <div className="critical-band" role="alert">
          <Siren size={18} aria-hidden />
          <p>
            <strong>
              {critical.length} critical {critical.length === 1 ? "result" : "results"}: act today.
            </strong>{" "}
            {critical.map(({ r }) => `${r.name} ${r.value ?? "—"} ${r.unit} (${FLAG_DISPLAY[r.flag].label.toLowerCase()})`).join(" · ")}
          </p>
        </div>
      )}

      <div className="summary-body">
        {status === "loading" && (
          <div aria-busy="true">
            <span className="skeleton" />
            <span className="skeleton short" />
          </div>
        )}
        <ErrorPanel error={error} />
        {data && (
          <>
            <h2 className="ai-lead">{data.commentary.summary}</h2>
            {data.commentary.follow_up.length > 0 && (
              <div className="consider">
                <h3>Consider</h3>
                <ul>
                  {data.commentary.follow_up.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        <div className="summary-foot">
          <span className="ai-meta">
            {data && <SourceTag />}
            <span className="muted small">Decision support only, not a diagnosis.</span>
          </span>
          <Button variant="quiet" size="sm" onClick={() => onStep("explain")}>
            Why? See likely explanations <ArrowRight size={14} aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ResultsStep({ c, active, onSelect, onStep }: { c: CaseState; active: number | null; onSelect: (i: number) => void; onStep: (s: Step) => void }) {
  const results = c.extraction.data!.results;
  const indexed = results.map((r, index) => ({ r, index }));
  const activeRow = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    activeRow.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  if (!results.length) {
    return (
      <section className="panel empty">
        <FileSearch size={28} aria-hidden />
        <h2>No results found in this document</h2>
        <p className="muted">Nothing that looks like a lab value was read. Check the original, or paste the results section on its own.</p>
        <Button variant="secondary" onClick={() => onStep("document")}>
          Show the original
        </Button>
      </section>
    );
  }

  return (
    <div className="split">
      <div className="stack">
        <Summary c={c} onStep={onStep} />

        <section className="panel" aria-labelledby="results-title">
          <header className="panel-head">
            <h2 id="results-title">Results</h2>
            <span className="muted small">Select a result to see where it came from</span>
          </header>
          <table className="results">
            <thead>
              <tr>
                <th>Test</th>
                <th className="num">Result</th>
                <th>Reference range</th>
                <th>Status</th>
                <th>
                  <span className="visually-hidden">Source</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((group) => {
                const rows = indexed.filter(({ r }) => groupOf(r) === group.id);
                if (!rows.length) return null;
                return (
                  <Fragment key={group.id}>
                    <tr className={`group-row tone-${group.id}`} id={`group-${group.id}`}>
                      <th colSpan={5} scope="rowgroup">
                        <span className="group-dot" aria-hidden />
                        {group.title} <span className="count-chip">{rows.length}</span>
                      </th>
                    </tr>
                    {rows.map(({ r, index }) => {
                      const notes = r.issues.map((i) => ISSUE_TEXT[i.code](r));
                      const isActive = index === active;
                      return (
                        <tr
                          key={index}
                          ref={isActive ? activeRow : undefined}
                          className={`result tone-${group.id}${isActive ? " is-active" : ""}`}
                          tabIndex={0}
                          aria-selected={isActive}
                          onClick={() => onSelect(index)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onSelect(index);
                            }
                          }}
                        >
                          <td>
                            <span className="test">{r.name}</span>
                            {notes.map((n) => (
                              <span key={n} className="note">
                                {n}
                              </span>
                            ))}
                          </td>
                          <td className="num value">
                            <strong>{r.value ?? "—"}</strong>
                            <span className="unit">{r.unit}</span>
                          </td>
                          <td className="range">
                            <RangeBar r={r} />
                            <span className="range-text">
                              {formatRange(r.ref_low, r.ref_high)}
                              {r.range_source === "default" && <span className="range-src" title="The report printed no range, so a standard adult range is used."> std</span>}
                            </span>
                          </td>
                          <td>
                            <FlagPill r={r} />
                          </td>
                          <td className="source-cell">
                            <FileSearch size={16} aria-hidden className="source-icon" />
                            <span className="visually-hidden">Show {r.name} in the original</span>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>

      <section className="panel original is-sticky" aria-labelledby="original-title">
        <header className="panel-head">
          <h2 id="original-title">Original document</h2>
          <span className="muted small">{active !== null ? `Showing ${results[active]?.name}` : "Values are underlined"}</span>
        </header>
        {active !== null && results[active] && (
          <p className="quote-line">
            <span className="muted">Quoted as</span> <q>{results[active].evidence.replace(/\s+/g, " ")}</q>
          </p>
        )}
        <TopSheet text={c.doc.text} results={results} active={active} onSelect={onSelect} />
      </section>
    </div>
  );
}
