import { ChevronRight, FilePlus2, FileText, Inbox } from "lucide-react";
import { caseName, caseStatus, hasPatientName } from "../case/status.ts";
import type { CaseDoc, CaseState } from "../case/useCases.ts";
import { initials } from "../format.ts";
import { Button } from "../ui/index.ts";
import { StatusIcon } from "./Sidebar.tsx";

export function Worklist({
  docs,
  cases,
  onAdd,
  onOpen,
}: {
  docs: CaseDoc[];
  cases: Record<string, CaseState>;
  onAdd: () => void;
  onOpen: (doc: CaseDoc) => void;
}) {
  const waiting = docs.filter((d) => !cases[d.id]?.reviewed).length;

  return (
    <div className="worklist">
      <header className="page-head page-head-row">
        <div>
          <h1>Incoming results</h1>
          <p>
            {docs.length === 0
              ? "Add a lab report to get started. Critical results sort to the top."
              : `${docs.length} ${docs.length === 1 ? "document" : "documents"} · ${waiting} not reviewed. Critical results sort to the top.`}
          </p>
        </div>
        <Button variant="primary" icon={<FilePlus2 size={16} aria-hidden />} onClick={onAdd}>
          Add a document
        </Button>
      </header>

      <div>
        <section className="panel" aria-labelledby="docs-title">
          <h2 id="docs-title" className="visually-hidden">
            Documents
          </h2>
          {docs.length === 0 ? (
            <div className="worklist-empty">
              <span className="worklist-empty-icon" aria-hidden>
                <Inbox size={22} />
              </span>
              <h3>Nothing to review yet</h3>
              <p>Photograph or upload a report. Each one is read, standardised and checked against the original, then listed here with what needs attention.</p>
              <Button variant="primary" icon={<FilePlus2 size={16} aria-hidden />} onClick={onAdd}>
                Add a document
              </Button>
            </div>
          ) : (
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Patient or document</th>
                  <th>What it is</th>
                  <th>Status</th>
                  <th>
                    <span className="visually-hidden">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => {
                  const c = cases[doc.id];
                  const status = c ? caseStatus(c) : { tone: "busy" as const, label: "Analysing" };
                  const named = hasPatientName(c);
                  const name = caseName(doc, c);
                  return (
                    <tr key={doc.id} className={`tone-row-${status.tone}`} onClick={() => onOpen(doc)}>
                      <td>
                        <span className="doc-cell">
                          <span className={`avatar${named ? "" : " is-doc"}`} aria-hidden>
                            {named ? initials(name) : <FileText size={16} />}
                          </span>
                          <span>
                            <button className="doc-open" onClick={(e) => (e.stopPropagation(), onOpen(doc))}>
                              {name}
                            </button>
                            {named && <span className="doc-sub">{doc.title}</span>}
                          </span>
                        </span>
                      </td>
                      <td className="doc-desc">{doc.description}</td>
                      <td>
                        <span className={`status-badge tone-${status.tone}`}>
                          <StatusIcon status={status} />
                          {status.label}
                        </span>
                      </td>
                      <td className="doc-go">
                        <ChevronRight size={18} aria-hidden />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

      </div>
    </div>
  );
}
