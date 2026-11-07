import { CircleHelp, LoaderCircle, Send, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { displayName, FLAG_DISPLAY, groupOf } from "../format.ts";
import { ErrorPanel, ResultChip, SourceTag } from "../ui/index.ts";
import type { CaseState } from "./useCases.ts";

/** Starter questions built from this patient's own results. */
function suggestions(c: CaseState): string[] {
  const results = c.extraction.data?.results ?? [];
  const flagged = results.filter((r) => groupOf(r) === "critical" || groupOf(r) === "outside").slice(0, 2);
  return [
    ...flagged.map((r) => `What could explain the ${FLAG_DISPLAY[r.flag].label.toLowerCase()} ${r.name}?`),
    "Which results should be repeated, and when?",
    "Is anything here urgent?",
  ].slice(0, 4);
}

export function AskPanel({
  c,
  open,
  onClose,
  onAsk,
  onShowResult,
}: {
  c: CaseState;
  open: boolean;
  onClose: () => void;
  onAsk: (q: string) => void;
  onShowResult: (i: number) => void;
}) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const results = c.extraction.data?.results ?? [];
  const busy = c.chat.some((t) => t.status === "loading");
  const starters = useMemo(() => suggestions(c), [c]);
  const name = displayName(c.extraction.data?.meta.patient_name);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [c.chat]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const send = (text: string) => {
    const question = text.trim();
    if (question.length < 2 || busy) return;
    onAsk(question);
    setQ("");
    input.current?.focus();
  };

  return (
    <aside className={`ask${open ? " is-open" : ""}`} aria-labelledby="ask-title" aria-hidden={!open} inert={!open}>
      <header className="ask-head">
        <div>
          <h2 id="ask-title">
            <Sparkles size={16} aria-hidden /> Ask about these results
          </h2>
          <p className="muted small">{name ?? c.doc.title} · answers use only the {results.length} extracted results</p>
        </div>
        <button className="icon-btn" aria-label="Close" onClick={onClose}>
          <X size={18} aria-hidden />
        </button>
      </header>

      <div className="ask-log" ref={log} aria-live="polite">
        {c.chat.length === 0 && (
          <div className="ask-empty">
            <p>Ask anything these results can answer. Each answer names the results it relies on, so you can check them.</p>
            <ul className="starters">
              {starters.map((s) => (
                <li key={s}>
                  <button onClick={() => send(s)}>{s}</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {c.chat.map((t) => (
          <div key={t.id} className="turn">
            <p className="turn-q">{t.question}</p>
            {t.status === "loading" && (
              <p className="turn-a is-busy">
                <LoaderCircle className="spin" size={14} aria-hidden /> Reading the results…
              </p>
            )}
            {t.status === "error" && <ErrorPanel error={t.error} />}
            {t.answer && (
              <div className={`turn-a${t.answer.answer.answerable ? "" : " is-unanswerable"}`}>
                <div className="turn-meta">
                  <SourceTag />
                  {!t.answer.answer.answerable && (
                    <span className="unanswerable">
                      <CircleHelp size={12} aria-hidden /> Not answerable from these results
                    </span>
                  )}
                </div>
                <p>{t.answer.answer.answer}</p>
                {t.answer.answer.analyte_ids.length > 0 && (
                  <div className="cause-cites">
                    {t.answer.answer.analyte_ids.map((id) => {
                      const i = results.findIndex((r) => r.analyte_id === id);
                      return i >= 0 ? <ResultChip key={id} r={results[i]!} onClick={() => onShowResult(i)} /> : null;
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <form
        className="ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          send(q);
        }}
      >
        <label className="visually-hidden" htmlFor="ask-input">
          Your question
        </label>
        <textarea
          id="ask-input"
          ref={input}
          rows={2}
          value={q}
          placeholder="Ask a question…"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(q);
            }
          }}
        />
        <button className="send-btn" type="submit" aria-label="Send question" disabled={busy || q.trim().length < 2}>
          {busy ? <LoaderCircle className="spin" size={18} aria-hidden /> : <Send size={18} aria-hidden />}
        </button>
      </form>
      <p className="ask-foot">Decision support, not a diagnosis.</p>
    </aside>
  );
}
