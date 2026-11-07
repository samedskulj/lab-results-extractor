import { ChevronRight, Menu } from "lucide-react";
import type { Route } from "../App.tsx";
import { caseName, type Triage } from "../case/status.ts";
import { STEP_LABEL } from "../case/Stepper.tsx";
import type { CaseState, Step } from "../case/useCases.ts";

/** "on" only after the AI has actually answered; "offline" once it has failed or has no key. */
export type AiState = "unknown" | "on" | "offline";

function AiChip({ ai }: { ai: AiState }) {
  if (ai === "unknown") return null;
  if (ai === "offline") {
    return (
      <span className="engine-chip tone-outside" title="The AI assistant isn't available, so documents are read by fixed rules. They only read tidy tables, and explanations are limited.">
        <span className="engine-dot" aria-hidden /> AI offline<span className="engine-long"> · basic checks only</span>
      </span>
    );
  }
  return (
    <span className="engine-chip tone-ai">
      <span className="engine-dot" aria-hidden /> AI assistant on
    </span>
  );
}

export function TopBar({
  route,
  current,
  triage,
  step,
  ai,
  onRoute,
  onToggleNav,
}: {
  route: Route;
  current?: CaseState;
  triage: Record<string, Triage>;
  step: Step;
  ai: AiState;
  onRoute: (r: Route) => void;
  onToggleNav: () => void;
}) {
  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" aria-label="Open menu" onClick={onToggleNav}>
        <Menu size={20} aria-hidden />
      </button>
      <nav className="crumbs" aria-label="Breadcrumb">
        <ol>
          <li>{route.kind === "case" ? <button onClick={() => onRoute({ kind: "worklist" })}>Worklist</button> : <span aria-current="page">Worklist</span>}</li>
          {route.kind === "case" && current && (
            <>
              <li>
                <ChevronRight size={14} aria-hidden />
                <span className="crumb-strong">{caseName(current.doc, current, triage[current.doc.id])}</span>
              </li>
              <li aria-current="page">
                <ChevronRight size={14} aria-hidden />
                {STEP_LABEL[step]}
              </li>
            </>
          )}
        </ol>
      </nav>
      <AiChip ai={ai} />
    </header>
  );
}
