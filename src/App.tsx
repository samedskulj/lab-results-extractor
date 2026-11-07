import { useCallback, useEffect, useMemo, useState } from "react";
import type { Extraction, ExtractorId, Sample } from "../shared/types.ts";
import { useAuth } from "./auth/AuthGate.tsx";
import { useSavedCases } from "./auth/useSavedCases.ts";
import { CaseView } from "./case/CaseView.tsx";
import { caseStatus, countGroups, STATUS_RANK, type Triage } from "./case/status.ts";
import { useCases, type CaseDoc, type CaseState, type Step } from "./case/useCases.ts";
import { Sidebar } from "./shell/Sidebar.tsx";
import { TopBar, type AiState } from "./shell/TopBar.tsx";
import { Worklist } from "./shell/Worklist.tsx";
import { hashText } from "./format.ts";
import { apiPost, useFetch, useHealth } from "./ui/index.ts";

export type Route = { kind: "worklist"; focusPaste?: number } | { kind: "case"; id: string };

const AI_KEY = "readout:ai-state";
const readAi = (): AiState => {
  try {
    const v = localStorage.getItem(AI_KEY);
    return v === "on" || v === "offline" ? v : "unknown";
  } catch {
    return "unknown";
  }
};

/** What the AI actually did in this session: never claim it works before it has. */
function aiStateFrom(cases: CaseState[], remembered: AiState, hasKey?: boolean): AiState {
  if (hasKey === false) return "offline";
  const tasks = cases.flatMap((c) => [c.extraction, c.summary, c.explanation, c.letter]);
  if (tasks.some((t) => t.fellBack)) return "offline";
  if (tasks.some((t) => t.status === "done" && !t.fellBack && (t.data as { extractor?: ExtractorId } | undefined)?.extractor === "claude")) return "on";
  return remembered;
}

export function App() {
  const health = useHealth();
  const samples = useFetch<Sample[]>("/api/samples");
  const engine: ExtractorId = health?.live ? "claude" : "baseline";
  const auth = useAuth();
  const cloud = useSavedCases(auth?.session ?? null);
  const store = useCases(engine, cloud.persistence);
  const [route, setRoute] = useState<Route>({ kind: "worklist" });
  const [pasted, setPasted] = useState<CaseDoc[]>([]);
  const [steps, setSteps] = useState<Record<string, Step>>({});
  const [navOpen, setNavOpen] = useState(false);
  const [triage, setTriage] = useState<Record<string, Triage>>({});

  const docs = useMemo<CaseDoc[]>(
    () => [...pasted, ...(samples.data ?? []).map((s) => ({ id: s.id, title: s.title, description: s.description, text: s.text }))],
    [pasted, samples.data],
  );

  // Pre-read every incoming document with the instant rule-based reader, so critical patients sort to the top before anyone opens them.
  useEffect(() => {
    for (const s of samples.data ?? []) {
      apiPost<Extraction>("/api/extract", { text: s.text, extractor: "baseline" }).then(
        (e) => setTriage((t) => ({ ...t, [s.id]: { counts: countGroups(e.results), patient_name: e.meta.patient_name } })),
        () => undefined,
      );
    }
  }, [samples.data]);

  // Reviews saved to the doctor's account, by document id, so unopened rows show them too.
  const savedReviewed = useMemo(() => Object.fromEntries(docs.map((d) => [d.id, Boolean(cloud.saved[hashText(d.text)]?.reviewed)])), [docs, cloud.saved]);

  // Critical first, then outside range; reviewed cases sink.
  const sorted = useMemo(
    () =>
      [...docs]
        .map((d, i) => ({ d, i, rank: STATUS_RANK[caseStatus(store.cases[d.id], triage[d.id], savedReviewed[d.id]).tone] }))
        .sort((a, b) => a.rank - b.rank || a.i - b.i)
        .map((x) => x.d),
    [docs, store.cases, triage, savedReviewed],
  );

  const openDoc = useCallback(
    (doc: CaseDoc) => {
      if (!docs.some((d) => d.id === doc.id)) setPasted((p) => [doc, ...p]);
      store.open(doc);
      setRoute({ kind: "case", id: doc.id });
      setNavOpen(false);
    },
    [docs, store],
  );

  const go = useCallback((r: Route) => {
    setRoute(r);
    setNavOpen(false);
  }, []);

  const current = route.kind === "case" ? store.cases[route.id] : undefined;
  // Until the doctor picks a step, a case shows its pipeline while reading and its results once read.
  const step: Step = route.kind === "case" ? (steps[route.id] ?? (current?.extraction.status === "done" ? "results" : "document")) : "document";
  const setStep = useCallback((s: Step) => route.kind === "case" && setSteps((all) => ({ ...all, [route.id]: s })), [route]);

  const [remembered] = useState(readAi);
  const ai = aiStateFrom(Object.values(store.cases), remembered, health ? health.live : undefined);
  useEffect(() => {
    if (ai === "unknown") return;
    try {
      localStorage.setItem(AI_KEY, ai);
    } catch {
      /* private mode */
    }
  }, [ai]);

  return (
    <div className={`shell${navOpen ? " nav-open" : ""}`}>
      <Sidebar docs={sorted} cases={store.cases} triage={triage} savedReviewed={savedReviewed} route={route} onRoute={go} onOpen={openDoc} />
      <div className="shell-main">
        <TopBar route={route} current={current} triage={triage} step={step} ai={ai} onRoute={go} onToggleNav={() => setNavOpen((o) => !o)} />
        <main className="main" id="main">
          {cloud.error && (
            <div className="notice save-notice" role="alert">
              <p>{cloud.error}</p>
              <button className="btn btn-quiet btn-sm" onClick={cloud.clearError}>
                Dismiss
              </button>
            </div>
          )}
          {route.kind === "worklist" && (
            <Worklist docs={sorted} cases={store.cases} triage={triage} savedReviewed={savedReviewed} samplesError={samples.error} focusPaste={route.focusPaste} onOpen={openDoc} />
          )}
          {route.kind === "case" && current && <CaseView key={route.id} state={current} step={step} onStep={setStep} store={store} />}
        </main>
      </div>
      {navOpen && <button className="nav-scrim" aria-label="Close menu" onClick={() => setNavOpen(false)} />}
    </div>
  );
}
