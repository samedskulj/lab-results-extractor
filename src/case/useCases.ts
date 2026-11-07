import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnswerResponse,
  CommentaryResponse,
  CommentaryResult,
  ExplanationResponse,
  Extraction,
  ExtractorId,
  LetterResponse,
} from "../../shared/types.ts";
import type { CasePersistence } from "../auth/useSavedCases.ts";
import { hashText } from "../format.ts";
import { apiPost, asApiError, type ApiError } from "../ui/index.ts";

export type Step = "document" | "results" | "explain" | "letter";

export interface Task<T> {
  status: "idle" | "loading" | "done" | "error";
  data?: T;
  error?: ApiError;
  /** True when Claude was unavailable and the rule-based engine answered instead. */
  fellBack?: boolean;
}

export interface CaseDoc {
  id: string;
  title: string;
  description?: string;
  text: string;
}

export interface ChatTurn {
  id: number;
  question: string;
  status: "loading" | "done" | "error";
  answer?: AnswerResponse;
  error?: ApiError;
  fellBack?: boolean;
}

export interface CaseState {
  doc: CaseDoc;
  extraction: Task<Extraction>;
  summary: Task<CommentaryResponse>;
  explanation: Task<ExplanationResponse>;
  letter: Task<LetterResponse>;
  letterDraft?: { subject: string; body: string };
  letterApproved: boolean;
  chat: ChatTurn[];
  reviewed: boolean;
}

const idle = { status: "idle" } as const;

/** Only the standardised fields ever reach the summary, explain, ask and letter steps. */
const forAi = (e: Extraction): CommentaryResult[] =>
  e.results.map(({ analyte_id, name, value, unit, ref_low, ref_high, flag }) => ({ analyte_id, name, value, unit, ref_low, ref_high, flag }));

/** Call with the chosen engine; if Claude is unavailable, ask the rule-based engine and say so. */
async function withFallback<T>(engine: ExtractorId, call: (e: ExtractorId) => Promise<T>): Promise<{ data: T; fellBack: boolean }> {
  try {
    return { data: await call(engine), fellBack: false };
  } catch (err) {
    const error = asApiError(err);
    if (error.code !== "claude_unavailable" || engine === "baseline") throw error;
    return { data: await call("baseline"), fellBack: true };
  }
}

const REVIEWED_KEY = "lab-results:reviewed";
const readReviewed = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(REVIEWED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
};
const writeReviewed = (set: Set<string>) => {
  try {
    localStorage.setItem(REVIEWED_KEY, JSON.stringify([...set]));
  } catch {
    /* private mode: ticks last for this visit only */
  }
};

/**
 * Every opened document becomes a case. A case runs the real pipeline in order
 * (read, standardise and verify in one call, then summarise, then explain) and keeps
 * its letter draft and conversation while the doctor moves between patients.
 */
export function useCases(engine: ExtractorId, persistence?: CasePersistence) {
  const [cases, setCases] = useState<Record<string, CaseState>>({});
  const casesRef = useRef(cases);
  useEffect(() => {
    casesRef.current = cases;
  }, [cases]);

  const patch = useCallback((id: string, fn: (c: CaseState) => Partial<CaseState>) => {
    setCases((all) => (all[id] ? { ...all, [id]: { ...all[id], ...fn(all[id]) } } : all));
  }, []);

  const analyse = useCallback(
    async (id: string, text: string, fresh = false) => {
      // A re-run starts the case's AI work again; a first open keeps any letter saved from before.
      patch(id, () =>
        fresh
          ? { extraction: { status: "loading" } }
          : { extraction: { status: "loading" }, summary: idle, explanation: idle, letter: idle, letterDraft: undefined, letterApproved: false, chat: [] },
      );
      let extraction: Extraction;
      try {
        const { data, fellBack } = await withFallback(engine, (e) => apiPost<Extraction>("/api/extract", { text, extractor: e }));
        extraction = data;
        patch(id, () => ({ extraction: { status: "done", data, fellBack } }));
      } catch (err) {
        patch(id, () => ({ extraction: { status: "error", error: asApiError(err) } }));
        return;
      }

      const results = forAi(extraction);
      const next = extraction.extractor;

      patch(id, () => ({ summary: { status: "loading" } }));
      try {
        const { data, fellBack } = await withFallback(next, (e) => apiPost<CommentaryResponse>("/api/commentary", { extractor: e, results }));
        patch(id, () => ({ summary: { status: "done", data, fellBack } }));
      } catch (err) {
        patch(id, () => ({ summary: { status: "error", error: asApiError(err) } }));
      }

      patch(id, () => ({ explanation: { status: "loading" } }));
      try {
        const { data, fellBack } = await withFallback(next, (e) => apiPost<ExplanationResponse>("/api/explain", { extractor: e, results }));
        patch(id, () => ({ explanation: { status: "done", data, fellBack } }));
      } catch (err) {
        patch(id, () => ({ explanation: { status: "error", error: asApiError(err) } }));
      }
    },
    [engine, patch],
  );

  /** Open a document as a case, analysing it the first time. */
  const open = useCallback(
    (doc: CaseDoc) => {
      if (casesRef.current[doc.id]) return;
      const hash = hashText(doc.text);
      const prior = persistence?.get(hash);
      const state: CaseState = {
        doc,
        extraction: { status: "loading" },
        summary: idle,
        explanation: idle,
        letter: prior?.letter ? { status: "done" } : idle,
        letterDraft: prior?.letter,
        letterApproved: prior?.letterApproved ?? false,
        chat: [],
        reviewed: prior?.reviewed ?? (persistence ? false : readReviewed().has(hash)),
      };
      setCases((all) => ({ ...all, [doc.id]: state }));
      void analyse(doc.id, doc.text, true);
    },
    [analyse, persistence],
  );

  const reanalyse = useCallback((id: string) => {
    const c = casesRef.current[id];
    if (c) void analyse(id, c.doc.text);
  }, [analyse]);

  const draftLetter = useCallback(
    async (id: string) => {
      const c = casesRef.current[id];
      const extraction = c?.extraction.data;
      if (!c || !extraction || c.letter.status === "loading") return;
      patch(id, () => ({ letter: { status: "loading" }, letterApproved: false }));
      try {
        const { data, fellBack } = await withFallback(extraction.extractor, (e) =>
          apiPost<LetterResponse>("/api/letter", { extractor: e, results: forAi(extraction), patient_name: extraction.meta.patient_name }),
        );
        patch(id, () => ({ letter: { status: "done", data, fellBack }, letterDraft: { ...data.letter } }));
      } catch (err) {
        patch(id, () => ({ letter: { status: "error", error: asApiError(err) } }));
      }
    },
    [patch],
  );

  /** Any edit withdraws approval, here and in the saved copy. */
  const editLetter = useCallback(
    (id: string, draft: { subject: string; body: string }) => {
      const c = casesRef.current[id];
      if (c?.letterApproved) persistence?.save(hashText(c.doc.text), c.doc.title, { letterApproved: false });
      patch(id, () => ({ letterDraft: draft, letterApproved: false }));
    },
    [patch, persistence],
  );

  /** Approving saves the letter as approved to the doctor's account; withdrawing clears the approval. */
  const approveLetter = useCallback(
    (id: string, approved: boolean) => {
      const c = casesRef.current[id];
      if (!c) return;
      patch(id, () => ({ letterApproved: approved }));
      persistence?.save(hashText(c.doc.text), c.doc.title, { letterApproved: approved, ...(approved && c.letterDraft ? { letter: c.letterDraft } : {}) });
    },
    [patch, persistence],
  );

  const turnId = useRef(0);
  const ask = useCallback(
    async (id: string, question: string) => {
      const c = casesRef.current[id];
      const extraction = c?.extraction.data;
      if (!c || !extraction) return;
      const tid = ++turnId.current;
      const history = c.chat.filter((t) => t.answer).slice(-5).map((t) => ({ question: t.question, answer: t.answer!.answer.answer }));
      patch(id, (cur) => ({ chat: [...cur.chat, { id: tid, question, status: "loading" }] }));
      const settle = (turn: Partial<ChatTurn>) => patch(id, (cur) => ({ chat: cur.chat.map((t) => (t.id === tid ? { ...t, ...turn } : t)) }));
      try {
        const { data, fellBack } = await withFallback(extraction.extractor, (e) =>
          apiPost<AnswerResponse>("/api/ask", { extractor: e, results: forAi(extraction), question, history }),
        );
        settle({ status: "done", answer: data, fellBack });
      } catch (err) {
        settle({ status: "error", error: asApiError(err) });
      }
    },
    [patch],
  );

  const setReviewed = useCallback(
    (id: string, reviewed: boolean) => {
      const c = casesRef.current[id];
      if (!c) return;
      const key = hashText(c.doc.text);
      if (persistence) {
        persistence.save(key, c.doc.title, { reviewed });
      } else {
        const set = readReviewed();
        if (reviewed) set.add(key);
        else set.delete(key);
        writeReviewed(set);
      }
      patch(id, () => ({ reviewed }));
    },
    [patch, persistence],
  );

  return { cases, open, reanalyse, draftLetter, editLetter, approveLetter, ask, setReviewed };
}

export type Cases = ReturnType<typeof useCases>;
