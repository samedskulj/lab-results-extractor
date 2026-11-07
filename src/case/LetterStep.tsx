import { CircleAlert, CircleCheck, Copy, Download, PenLine, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { groupOf } from "../format.ts";
import { Button, ErrorPanel, SourceTag } from "../ui/index.ts";
import type { CaseState, Cases } from "./useCases.ts";

interface Check {
  ok: boolean;
  text: string;
}

/** Plain checks the doctor can trust: does the draft mention what it must, and is it finished? */
function checksFor(c: CaseState, body: string): Check[] {
  const lower = body.toLowerCase();
  const results = c.extraction.data?.results ?? [];
  const flagged = results.filter((r) => r.value !== null && (groupOf(r) === "critical" || groupOf(r) === "outside"));
  const mentions = flagged.map((r) => {
    const ok = lower.includes(String(r.value)) || lower.includes(r.name.toLowerCase());
    return { ok, text: ok ? `Mentions ${r.name} (${r.value} ${r.unit})` : `Doesn't mention ${r.name}, which is out of range` };
  });
  const sentences = body.split(/[.!?]+\s/).filter((s) => s.trim().length > 0);
  const words = body.split(/\s+/).filter(Boolean).length;
  const avg = sentences.length ? Math.round(words / sentences.length) : 0;
  const placeholders = body.match(/\[[^\]]+\]/g) ?? [];
  const hasCritical = results.some((r) => groupOf(r) === "critical");
  return [
    ...mentions,
    ...(hasCritical ? [{ ok: /today|urgent|phone|call/i.test(body), text: "Tells the patient a critical result needs action today" }] : []),
    { ok: avg > 0 && avg <= 18, text: `Short sentences: ${avg} words on average` },
    placeholders.length
      ? { ok: false, text: `Fill in ${placeholders.join(", ")} before approving` }
      : { ok: true, text: "No placeholders left to fill" },
  ];
}

export function LetterStep({ c, store }: { c: CaseState; store: Cases }) {
  const id = c.doc.id;
  const { status, data, error } = c.letter;
  const draft = c.letterDraft;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "idle") void store.draftLetter(id);
  }, [status, id, store]);

  const checks = useMemo(() => (draft ? checksFor(c, draft.body) : []), [c, draft]);
  const placeholders = draft?.body.match(/\[[^\]]+\]/g) ?? [];
  const blocking = placeholders.length > 0;
  const text = draft ? `${draft.subject}\n\n${draft.body}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    Object.assign(document.createElement("a"), { href: url, download: `${id}-letter.txt` }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="split split-letter">
      <section className="panel letter" aria-labelledby="letter-title" aria-busy={status === "loading"}>
        <header className="ai-head">
          <h2 id="letter-title">Letter to the patient</h2>
          {data && <SourceTag />}
          <span className={`approval${c.letterApproved ? " is-approved" : ""}`}>
            {c.letterApproved ? <ShieldCheck size={14} aria-hidden /> : <PenLine size={14} aria-hidden />}
            {c.letterApproved ? "Approved by you" : "Draft: needs your approval"}
          </span>
        </header>

        {status === "loading" && (
          <div className="letter-skeleton">
            <p className="loading-text">Drafting a plain-language letter…</p>
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton short" />
          </div>
        )}
        <ErrorPanel
          error={error}
          action={
            <Button variant="secondary" size="sm" icon={<RotateCcw size={14} aria-hidden />} onClick={() => void store.draftLetter(id)}>
              Try again
            </Button>
          }
        />

        {draft && status !== "loading" && (
          <>
            <label className="field">
              <span className="field-label">Subject</span>
              <input value={draft.subject} onChange={(e) => store.editLetter(id, { ...draft, subject: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">Letter</span>
              <textarea className="letter-body" value={draft.body} rows={18} onChange={(e) => store.editLetter(id, { ...draft, body: e.target.value })} />
            </label>
            <div className="letter-actions">
              {c.letterApproved ? (
                <>
                  <Button icon={<Copy size={16} aria-hidden />} onClick={() => void copy()}>
                    {copied ? "Copied" : "Copy letter"}
                  </Button>
                  <Button variant="secondary" icon={<Download size={16} aria-hidden />} onClick={download}>
                    Download .txt
                  </Button>
                  <Button variant="quiet" onClick={() => store.approveLetter(id, false)}>
                    Withdraw approval
                  </Button>
                </>
              ) : (
                <>
                  <Button icon={<ShieldCheck size={16} aria-hidden />} disabled={blocking} onClick={() => store.approveLetter(id, true)}>
                    Approve letter
                  </Button>
                  <Button variant="quiet" icon={<RotateCcw size={16} aria-hidden />} onClick={() => void store.draftLetter(id)}>
                    Redraft
                  </Button>
                  {blocking && <span className="muted small">Replace {placeholders.join(", ")} in the letter to approve it.</span>}
                </>
              )}
            </div>
          </>
        )}
      </section>

      <aside className="panel letter-checks" aria-labelledby="checks-title">
        <header className="panel-head">
          <h2 id="checks-title">Checks</h2>
          <span className="muted small">Update as you edit</span>
        </header>
        {draft ? (
          <ul className="checks">
            {checks.map((k) => (
              <li key={k.text} className={k.ok ? "is-ok" : "is-warn"}>
                {k.ok ? <CircleCheck size={16} aria-label="Passes" /> : <CircleAlert size={16} aria-label="Needs attention" />}
                {k.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="panel-pad muted">Checks appear once the draft is ready.</p>
        )}
        <p className="panel-foot">Written only from the standardised results. It never sees the original document, history or symptoms; add what it can&apos;t know.</p>
      </aside>
    </div>
  );
}
