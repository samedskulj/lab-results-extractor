import { useCallback, useMemo, useState } from "react";
import { useAuth } from "./auth/AuthGate.tsx";
import { useSavedCases } from "./auth/useSavedCases.ts";
import { CaseView } from "./case/CaseView.tsx";
import { caseStatus, STATUS_RANK } from "./case/status.ts";
import { useCases, type CaseDoc, type Step } from "./case/useCases.ts";
import { Sidebar } from "./shell/Sidebar.tsx";
import { TopBar } from "./shell/TopBar.tsx";
import { Worklist } from "./shell/Worklist.tsx";

export type Route = { kind: "worklist"; focusAdd?: number } | { kind: "case"; id: string };

export function App() {
  const auth = useAuth();
  const cloud = useSavedCases(auth?.session ?? null);
  const store = useCases(cloud.persistence);
  const [route, setRoute] = useState<Route>({ kind: "worklist" });
  const [docs, setDocs] = useState<CaseDoc[]>([]);
  const [steps, setSteps] = useState<Record<string, Step>>({});
  const [navOpen, setNavOpen] = useState(false);

  // Critical first, then outside range; reviewed cases sink. Equal ranks keep the newest on top.
  const sorted = useMemo(
    () =>
      docs
        .map((d, i) => ({ d, i, rank: store.cases[d.id] ? STATUS_RANK[caseStatus(store.cases[d.id]!).tone] : STATUS_RANK.busy }))
        .sort((a, b) => a.rank - b.rank || a.i - b.i)
        .map((x) => x.d),
    [docs, store.cases],
  );

  const openDoc = useCallback(
    (doc: CaseDoc) => {
      setDocs((all) => (all.some((d) => d.id === doc.id) ? all : [doc, ...all]));
      store.open(doc);
      setRoute({ kind: "case", id: doc.id });
      setNavOpen(false);
    },
    [store],
  );

  const go = useCallback((r: Route) => {
    setRoute(r);
    setNavOpen(false);
  }, []);

  const current = route.kind === "case" ? store.cases[route.id] : undefined;
  // Until the doctor picks a step, a case shows its pipeline while reading and its results once read.
  const step: Step = route.kind === "case" ? (steps[route.id] ?? (current?.extraction.status === "done" ? "results" : "document")) : "document";
  const setStep = useCallback((s: Step) => route.kind === "case" && setSteps((all) => ({ ...all, [route.id]: s })), [route]);

  return (
    <div className={`shell${navOpen ? " nav-open" : ""}`}>
      <Sidebar docs={sorted} cases={store.cases} route={route} onRoute={go} onOpen={openDoc} />
      <div className="shell-main">
        <TopBar route={route} current={current} step={step} onRoute={go} onToggleNav={() => setNavOpen((o) => !o)} />
        <main className="main" id="main">
          {cloud.error && (
            <div className="notice save-notice" role="alert">
              <p>{cloud.error}</p>
              <button className="btn btn-quiet btn-sm" onClick={cloud.clearError}>
                Dismiss
              </button>
            </div>
          )}
          {route.kind === "worklist" && <Worklist docs={sorted} cases={store.cases} focusAdd={route.focusAdd} onOpen={openDoc} />}
          {route.kind === "case" && current && <CaseView key={route.id} state={current} step={step} onStep={setStep} store={store} />}
        </main>
      </div>
      {navOpen && <button className="nav-scrim" aria-label="Close menu" onClick={() => setNavOpen(false)} />}
    </div>
  );
}
