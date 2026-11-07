import { Check, CircleAlert, FilePlus2, FileText, Inbox, LoaderCircle, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthGate.tsx";
import type { Route } from "../App.tsx";
import { caseName, caseStatus, hasPatientName, type CaseStatus } from "../case/status.ts";
import type { CaseDoc, CaseState } from "../case/useCases.ts";
import { initials } from "../format.ts";
import { Mark } from "../ui/Mark.tsx";

export function StatusIcon({ status }: { status: CaseStatus }) {
  if (status.tone === "busy") return <LoaderCircle className="spin" size={14} aria-hidden />;
  if (status.tone === "reviewed") return <Check size={14} aria-hidden />;
  if (status.tone === "error") return <CircleAlert size={14} aria-hidden />;
  return <span className="status-dot" aria-hidden />;
}

export function Sidebar({
  docs,
  cases,
  route,
  onRoute,
  onOpen,
}: {
  docs: CaseDoc[];
  cases: Record<string, CaseState>;
  route: Route;
  onRoute: (r: Route) => void;
  onOpen: (doc: CaseDoc) => void;
}) {
  const auth = useAuth();
  const waiting = docs.filter((d) => !cases[d.id]?.reviewed).length;

  return (
    <aside className="sidebar" aria-label="Navigation">
      <a className="brand" href="/" title="Readout home">
        <Mark />
        <span className="brand-name">Readout</span>
      </a>

      <nav className="side-nav" aria-label="Main">
        <button className={route.kind === "worklist" ? "is-current" : ""} aria-current={route.kind === "worklist" ? "page" : undefined} onClick={() => onRoute({ kind: "worklist" })}>
          <Inbox size={18} aria-hidden />
          Worklist
          {waiting > 0 && <span className="nav-count" aria-label={`${waiting} not reviewed`}>{waiting}</span>}
        </button>
        <button onClick={() => onRoute({ kind: "worklist", focusAdd: Date.now() })}>
          <FilePlus2 size={18} aria-hidden />
          Add a document
        </button>
      </nav>

      <section className="incoming" aria-labelledby="incoming-title">
        <h2 id="incoming-title" className="side-heading">
          Incoming
        </h2>
        <ul>
          {docs.map((doc) => {
            const c = cases[doc.id];
            const name = caseName(doc, c);
            const named = hasPatientName(c);
            const status = c ? caseStatus(c) : { tone: "new" as const, label: "New" };
            const isCurrent = route.kind === "case" && route.id === doc.id;
            return (
              <li key={doc.id}>
                <button className={`incoming-item${isCurrent ? " is-current" : ""}`} aria-current={isCurrent ? "page" : undefined} onClick={() => onOpen(doc)}>
                  <span className={`avatar avatar-sm${named ? "" : " is-doc"}`} aria-hidden>
                    {named ? initials(name) : <FileText size={14} />}
                  </span>
                  <span className="incoming-text">
                    <span className="incoming-name">{name}</span>
                    <span className={`incoming-status tone-${status.tone}`}>
                      <StatusIcon status={status} />
                      {status.label}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="side-foot">
        {auth && (
          <div className="account">
            <span className="account-email" title={auth.session.user.email}>
              {auth.session.user.email}
            </span>
            <button className="icon-btn" aria-label="Sign out" title="Sign out" onClick={() => void auth.signOut()}>
              <LogOut size={16} aria-hidden />
            </button>
          </div>
        )}
        <p>Decision support, not a diagnosis.</p>
      </div>
    </aside>
  );
}
