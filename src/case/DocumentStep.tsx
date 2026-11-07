import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import type { ExtractorId } from "../../shared/types.ts";
import { ENGINE_NAME, seconds } from "../format.ts";
import { TopSheet } from "./TopSheet.tsx";
import type { CaseState, Task } from "./useCases.ts";

type Status = Task<unknown>["status"];

interface Stage {
  title: string;
  by: string;
  status: Status;
  detail: string;
  time?: number;
}

const byName = (engine?: ExtractorId, fellBack?: boolean) => (engine ? `${ENGINE_NAME[engine]}${fellBack ? " · AI offline" : ""}` : "AI");

/** The real stages, with counts taken from the results themselves. */
function stages(c: CaseState): Stage[] {
  const ex = c.extraction;
  const results = ex.data?.results ?? [];
  const engine = ex.data?.extractor;
  const converted = results.filter((r) => r.issues.some((i) => i.code === "converted")).length;
  const defaults = results.filter((r) => r.range_source === "default").length;
  const unverified = results.filter((r) => r.issues.some((i) => i.code === "ungrounded" || i.code === "value_not_in_evidence")).length;
  const toCheck = results.filter((r) => r.needs_review).length;
  const explanations = c.explanation.data?.explanation.explanations.length ?? 0;
  const codeStatus: Status = ex.status === "done" ? "done" : ex.status === "error" ? "error" : ex.status === "loading" ? "idle" : "idle";

  return [
    {
      title: "Read",
      by: byName(engine, ex.fellBack),
      status: ex.status,
      detail: ex.status === "done" ? `${results.length} results found, each with the quote it came from` : ex.status === "loading" ? "Finding every current result and quoting it" : "Not started",
      time: ex.data?.elapsed_ms,
    },
    {
      title: "Standardise",
      by: "Rules",
      status: codeStatus,
      detail: ex.status === "done" ? `${converted} converted to SI units · ${defaults} standard adult ${defaults === 1 ? "range" : "ranges"} applied` : "Standard names, SI units, reference ranges",
    },
    {
      title: "Verify",
      by: "Rules",
      status: codeStatus,
      detail:
        ex.status === "done"
          ? `${results.length - unverified} of ${results.length} values found in their quote${toCheck ? ` · ${toCheck} to check by hand` : ""}`
          : "Every value must appear in a quote that exists in the document",
    },
    {
      title: "Summarise",
      by: byName(c.summary.data ? engine : undefined, c.summary.fellBack),
      status: c.summary.status,
      detail: c.summary.status === "done" ? "Summary written from the standardised values only" : c.summary.status === "error" ? (c.summary.error?.message ?? "Failed") : "Short summary for the results page",
      time: c.summary.data?.elapsed_ms,
    },
    {
      title: "Explain",
      by: byName(c.explanation.data?.extractor, c.explanation.fellBack),
      status: c.explanation.status,
      detail:
        c.explanation.status === "done"
          ? `${explanations} likely ${explanations === 1 ? "explanation" : "explanations"}, each threaded to its results`
          : c.explanation.status === "error"
            ? (c.explanation.error?.message ?? "Failed")
            : "Likely explanations for the abnormal pattern",
      time: c.explanation.data?.elapsed_ms,
    },
  ];
}

function StageIcon({ status, n }: { status: Status; n: number }) {
  if (status === "loading") return <LoaderCircle className="spin" size={16} aria-label="Running" />;
  if (status === "done") return <Check size={16} strokeWidth={2.5} aria-label="Done" />;
  if (status === "error") return <CircleAlert size={16} aria-label="Failed" />;
  return <span aria-label="Waiting">{n}</span>;
}

export function DocumentStep({ c, active, onSelect }: { c: CaseState; active: number | null; onSelect: (i: number) => void }) {
  return (
    <div className="split split-doc">
      <section className="panel pipeline" aria-labelledby="pipeline-title" aria-live="polite">
        <header className="panel-head">
          <h2 id="pipeline-title">Pipeline</h2>
        </header>
        <ol className="stages">
          {stages(c).map((s, i) => (
            <li key={s.title} className={`stage is-${s.status}`}>
              <span className="stage-dot">
                <StageIcon status={s.status} n={i + 1} />
              </span>
              <div className="stage-body">
                <p className="stage-title">
                  {s.title} <span className={`by${s.by.startsWith("AI") ? " is-ai" : ""}`}>{s.by}</span>
                  {s.time !== undefined && <span className="stage-time">{seconds(s.time)}</span>}
                </p>
                <p className="stage-detail">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="panel-foot">The AI only reads the document and writes prose. Units, ranges and flags are set by fixed clinical rules, and any value without a matching quote is marked to check.</p>
      </section>

      <section className="panel original" aria-labelledby="original-title">
        <header className="panel-head">
          <h2 id="original-title">Original document</h2>
          <span className="muted small">{c.doc.title}</span>
        </header>
        <TopSheet text={c.doc.text} results={c.extraction.data?.results ?? []} active={active} onSelect={onSelect} />
      </section>
    </div>
  );
}
