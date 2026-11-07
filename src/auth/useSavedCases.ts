import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { explainSupabaseError, supabase } from "../lib/supabase.ts";

/** What survives between sessions and devices for one doctor and one document. Never the document itself. */
export interface SavedCase {
  reviewed: boolean;
  letter?: { subject: string; body: string };
  letterApproved: boolean;
}

export interface CasePersistence {
  get(hash: string): SavedCase | undefined;
  save(hash: string, title: string, patch: Partial<SavedCase>): void;
}

interface Row {
  document_hash: string;
  reviewed: boolean;
  letter_subject: string | null;
  letter_body: string | null;
  letter_approved_at: string | null;
}

const fromRow = (r: Row): SavedCase => ({
  reviewed: r.reviewed,
  letter: r.letter_body !== null ? { subject: r.letter_subject ?? "", body: r.letter_body } : undefined,
  letterApproved: r.letter_approved_at !== null,
});

/** The signed-in doctor's saved cases, kept in Supabase. Null session means nothing is saved remotely. */
export function useSavedCases(session: Session | null) {
  const [saved, setSaved] = useState<Record<string, SavedCase>>({});
  const [error, setError] = useState<string>();
  const savedRef = useRef(saved);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);
  const userId = session?.user.id;

  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;
    supabase
      .from("case_reviews")
      .select("document_hash, reviewed, letter_subject, letter_body, letter_approved_at")
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) return setError(explainSupabaseError(err));
        setSaved(Object.fromEntries((data as Row[]).map((r) => [r.document_hash, fromRow(r)])));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const get = useCallback((hash: string) => savedRef.current[hash], []);

  const save = useCallback(
    (hash: string, title: string, patch: Partial<SavedCase>) => {
      if (!supabase || !userId) return;
      setSaved((all) => ({ ...all, [hash]: { reviewed: false, letterApproved: false, ...all[hash], ...patch } }));
      const row: Record<string, unknown> = { doctor_id: userId, document_hash: hash, document_title: title };
      if (patch.reviewed !== undefined) Object.assign(row, { reviewed: patch.reviewed, reviewed_at: patch.reviewed ? new Date().toISOString() : null });
      if (patch.letter) Object.assign(row, { letter_subject: patch.letter.subject, letter_body: patch.letter.body });
      if (patch.letterApproved !== undefined) row.letter_approved_at = patch.letterApproved ? new Date().toISOString() : null;
      void supabase
        .from("case_reviews")
        .upsert(row, { onConflict: "doctor_id,document_hash" })
        .then(({ error: err }) => setError(err ? `Couldn't save: ${explainSupabaseError(err)}` : undefined));
    },
    [userId],
  );

  const persistence = useMemo<CasePersistence | undefined>(() => (userId ? { get, save } : undefined), [userId, get, save]);
  return { saved, persistence, error, clearError: () => setError(undefined) };
}
