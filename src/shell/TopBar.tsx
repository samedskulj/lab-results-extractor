import { ChevronRight, Menu } from "lucide-react";
import type { Route } from "../App.tsx";
import { caseName } from "../case/status.ts";
import { STEP_LABEL } from "../case/Stepper.tsx";
import type { CaseState, Step } from "../case/useCases.ts";

export function TopBar({
  route,
  current,
  step,
  onRoute,
  onToggleNav,
}: {
  route: Route;
  current?: CaseState;
  step: Step;
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
                <span className="crumb-strong">{caseName(current.doc, current)}</span>
              </li>
              <li aria-current="page">
                <ChevronRight size={14} aria-hidden />
                {STEP_LABEL[step]}
              </li>
            </>
          )}
        </ol>
      </nav>
    </header>
  );
}
