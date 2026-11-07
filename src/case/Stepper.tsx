import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import type { CaseState, Step } from "./useCases.ts";

export const STEP_LABEL: Record<Step, string> = { document: "Document", results: "Results", explain: "Explain", letter: "Patient letter" };
const ORDER: Step[] = ["document", "results", "explain", "letter"];

type StepState = { state: "todo" | "busy" | "done" | "error"; note: string };

function stepState(step: Step, c: CaseState): StepState {
  const ex = c.extraction.status;
  switch (step) {
    case "document":
      return ex === "loading" ? { state: "busy", note: "Reading" } : ex === "error" ? { state: "error", note: "Failed" } : { state: "done", note: "Read" };
    case "results":
      return ex === "done" ? { state: "done", note: `${c.extraction.data?.results.length ?? 0} results` } : { state: "todo", note: "Waiting" };
    case "explain": {
      const s = c.explanation.status;
      if (s === "loading") return { state: "busy", note: "Thinking" };
      if (s === "error") return { state: "error", note: "Failed" };
      if (s === "done") {
        const n = c.explanation.data?.explanation.explanations.length ?? 0;
        return { state: "done", note: n ? `${n} likely ${n === 1 ? "cause" : "causes"}` : "Nothing found" };
      }
      return { state: "todo", note: "Waiting" };
    }
    case "letter":
      if (c.letterApproved) return { state: "done", note: "Approved" };
      if (c.letter.status === "loading") return { state: "busy", note: "Drafting" };
      if (c.letter.status === "error") return { state: "error", note: "Failed" };
      if (c.letter.status === "done") return { state: "todo", note: "Draft to approve" };
      return { state: "todo", note: "Not drafted" };
  }
}

/** The case's four steps: navigation and live progress in one control. */
export function Stepper({ c, step, onStep }: { c: CaseState; step: Step; onStep: (s: Step) => void }) {
  const ready = c.extraction.status === "done";
  return (
    <nav className="stepper" aria-label="Case steps">
      <ol>
        {ORDER.map((s, i) => {
          const st = stepState(s, c);
          const disabled = s !== "document" && !ready;
          return (
            <li key={s} className={`step is-${st.state}${s === step ? " is-current" : ""}`}>
              <button onClick={() => onStep(s)} disabled={disabled} aria-current={s === step ? "step" : undefined}>
                <span className="step-dot" aria-hidden>
                  {st.state === "busy" ? (
                    <LoaderCircle className="spin" size={14} />
                  ) : st.state === "done" ? (
                    <Check size={14} strokeWidth={2.5} />
                  ) : st.state === "error" ? (
                    <CircleAlert size={14} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="step-text">
                  <span className="step-label">{STEP_LABEL[s]}</span>
                  <span className="step-note">{st.note}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
