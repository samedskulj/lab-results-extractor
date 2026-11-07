import { ChevronRight, ClipboardPaste, FileText, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { caseName, caseStatus, hasPatientName, type Triage } from "../case/status.ts";
import type { CaseDoc, CaseState } from "../case/useCases.ts";
import { hashText, initials } from "../format.ts";
import { Button } from "../ui/index.ts";
import { StatusIcon } from "./Sidebar.tsx";

const MIN_LENGTH = 20;

export function Worklist({
  docs,
  cases,
  triage,
  savedReviewed,
  samplesError,
  focusPaste,
  onOpen,
}: {
  docs: CaseDoc[];
  cases: Record<string, CaseState>;
  triage: Record<string, Triage>;
  savedReviewed: Record<string, boolean>;
  samplesError?: string;
  focusPaste?: number;
  onOpen: (doc: CaseDoc) => void;
}) {
  const [text, setText] = useState("");
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusPaste) pasteRef.current?.focus();
  }, [focusPaste]);
  const waiting = docs.filter((d) => !(cases[d.id]?.reviewed ?? savedReviewed[d.id])).length;
  const tooShort = text.trim().length < MIN_LENGTH;

  const analysePasted = () => {
    const firstLine = text.trim().split("\n")[0]?.trim().slice(0, 60);
    onOpen({ id: `pasted-${hashText(text)}`, title: "Pasted document", description: firstLine, text });
    setText("");
  };

  return (
    <div className="worklist">
      <header className="page-head">
        <h1>Incoming results</h1>
        <p>
          {docs.length} {docs.length === 1 ? "document" : "documents"} · {waiting} not reviewed. Unopened documents get a quick pre-read so critical results sort to the top.
        </p>
      </header>

      <div className="worklist-grid">
        <section className="panel" aria-labelledby="docs-title">
          <h2 id="docs-title" className="visually-hidden">
            Documents
          </h2>
          {samplesError && <p className="panel-pad muted">Couldn&apos;t load the sample documents: {samplesError}</p>}
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
                const t = triage[doc.id];
                const status = caseStatus(c, t, savedReviewed[doc.id]);
                const named = hasPatientName(c, t);
                const name = caseName(doc, c, t);
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
        </section>

        <section className="panel paste" aria-labelledby="paste-title">
          <h2 id="paste-title">
            <ClipboardPaste size={18} aria-hidden /> Add a document
          </h2>
          <p className="muted">Paste a lab report, a lab-system export or a clinic letter. Text only for now; PDFs and scans need copying out first.</p>
          <label className="visually-hidden" htmlFor="paste-input">
            Document text
          </label>
          <textarea ref={pasteRef} id="paste-input" className="paste-input" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste results here…" />
          <div className="paste-actions">
            <span className="muted small">{tooShort && text.length > 0 ? `At least ${MIN_LENGTH} characters` : ""}</span>
            <Button variant="ai" icon={<Sparkles size={16} aria-hidden />} disabled={tooShort} onClick={analysePasted}>
              Analyse document
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
