import { CalendarDays, Check, Download, FlaskConical, MessageSquareText, RotateCcw, ScrollText, User } from "lucide-react";
import { useCallback, useState } from "react";
import { displayName, initials } from "../format.ts";
import { Button, ErrorPanel } from "../ui/index.ts";
import { AskPanel } from "./AskPanel.tsx";
import { DocumentStep } from "./DocumentStep.tsx";
import { ExplainStep } from "./ExplainStep.tsx";
import { LetterStep } from "./LetterStep.tsx";
import { ResultsStep } from "./ResultsStep.tsx";
import { Stepper } from "./Stepper.tsx";
import type { CaseState, Cases, Step } from "./useCases.ts";

function exportCase(c: CaseState) {
  const data = {
    document: c.doc.title,
    extraction: c.extraction.data,
    summary: c.summary.data,
    explanation: c.explanation.data,
    letter: c.letterApproved ? c.letterDraft : undefined,
    reviewed: c.reviewed,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  Object.assign(document.createElement("a"), { href: url, download: `${c.doc.id}.json` }).click();
  URL.revokeObjectURL(url);
}

export function CaseView({ state: c, step, onStep, store }: { state: CaseState; step: Step; onStep: (s: Step) => void; store: Cases }) {
  const [active, setActive] = useState<number | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const meta = c.extraction.data?.meta;
  const name = displayName(meta?.patient_name);
  const id = c.doc.id;
  const ready = c.extraction.status === "done";

  /** Jump from anything that cites a result to that result and its source quote. */
  const showResult = useCallback(
    (index: number) => {
      setActive(index);
      onStep("results");
    },
    [onStep],
  );

  return (
    <div className={`case${askOpen ? " ask-open" : ""}`}>
      <section className="panel case-head" aria-labelledby="patient-name">
        <div className="patient">
          <span className={`avatar avatar-lg${name ? "" : " is-doc"}`} aria-hidden>
            {name ? initials(name) : <ScrollText size={20} />}
          </span>
          <div className="patient-text">
            <h1 id="patient-name">{name ?? (c.extraction.status === "loading" ? "Reading document…" : "Patient not named")}</h1>
            <ul className="meta-chips" aria-label="Report details">
              {meta?.date_of_birth && (
                <li>
                  <User size={13} aria-hidden /> DOB {meta.date_of_birth}
                </li>
              )}
              {meta?.collected_on && (
                <li>
                  <CalendarDays size={13} aria-hidden /> Collected {meta.collected_on}
                </li>
              )}
              {meta?.lab_name && (
                <li title={meta.lab_name}>
                  <FlaskConical size={13} aria-hidden /> {meta.lab_name}
                </li>
              )}
              <li className="meta-doc">
                <ScrollText size={13} aria-hidden /> {c.doc.title}
              </li>
            </ul>
          </div>
        </div>
        <Stepper c={c} step={step} onStep={onStep} />
        <div className="case-actions">
          <Button variant="ai" icon={<MessageSquareText size={16} aria-hidden />} disabled={!ready} onClick={() => setAskOpen(true)} aria-expanded={askOpen}>
            Ask about these results
          </Button>
          <Button
            variant="secondary"
            className={c.reviewed ? "is-on" : ""}
            icon={<Check size={16} aria-hidden />}
            disabled={!ready}
            aria-pressed={c.reviewed}
            onClick={() => store.setReviewed(id, !c.reviewed)}
          >
            {c.reviewed ? "Reviewed" : "Mark reviewed"}
          </Button>
          <Button variant="quiet" icon={<Download size={16} aria-hidden />} disabled={!ready} onClick={() => exportCase(c)}>
            Export
          </Button>
        </div>
      </section>

      {c.extraction.fellBack && (
        <div className="notice" role="status">
          <p>
            <strong>The AI assistant is offline, so this document was read by fixed rules.</strong> They only read tidy tables: results in letters or scans may be
            missing. Check the original.
          </p>
          <Button variant="secondary" size="sm" icon={<RotateCcw size={14} aria-hidden />} onClick={() => store.reanalyse(id)}>
            Try the AI again
          </Button>
        </div>
      )}

      {c.extraction.status === "error" && (
        <ErrorPanel
          error={c.extraction.error}
          action={
            <Button variant="secondary" size="sm" icon={<RotateCcw size={14} aria-hidden />} onClick={() => store.reanalyse(id)}>
              Try again
            </Button>
          }
        />
      )}

      {step === "document" && <DocumentStep c={c} active={active} onSelect={setActive} />}
      {step === "results" && ready && <ResultsStep c={c} active={active} onSelect={setActive} onStep={onStep} />}
      {step === "explain" && ready && <ExplainStep c={c} onShowResult={showResult} onRetry={() => store.reanalyse(id)} onAsk={() => setAskOpen(true)} />}
      {step === "letter" && ready && <LetterStep c={c} store={store} />}

      {ready && <AskPanel c={c} open={askOpen} onClose={() => setAskOpen(false)} onAsk={(q) => void store.ask(id, q)} onShowResult={showResult} />}
    </div>
  );
}
