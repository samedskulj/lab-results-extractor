import { useCallback, useState } from "react";
import type { ApiErrorBody } from "../../shared/contract.ts";
import { supabase } from "../lib/supabase.ts";

/** An API failure with a sentence for the user and, when relevant, a recovery hint. */
export class ApiError extends Error {
  code?: ApiErrorBody["code"];
  constructor(message: string, code?: ApiErrorBody["code"]) {
    super(message);
    this.code = code;
  }
}

/** The signed-in doctor's access token, sent so the server knows who is asking. */
async function authHeader(): Promise<Record<string, string>> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { ...(await authHeader()), ...init?.headers } });
  } catch {
    throw new ApiError("Can't reach the server. Is `npm run dev` running?");
  }
  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const { error, code } = body as Partial<ApiErrorBody>;
    throw new ApiError(error ?? `Request failed (${res.status})`, code);
  }
  return body as T;
}

export const apiGet = <T>(path: string): Promise<T> => request<T>(path);

export const apiPost = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const asApiError = (err: unknown): ApiError => (err instanceof ApiError ? err : new ApiError((err as Error).message));

/** Wrap an async call with loading / error / result state. */
export function useAction<Args extends unknown[], T>(fn: (...args: Args) => Promise<T>) {
  const [state, setState] = useState<{ data?: T; error?: ApiError; loading: boolean }>({ loading: false });

  const run = useCallback(
    async (...args: Args) => {
      setState((s) => ({ data: s.data, loading: true }));
      try {
        setState({ data: await fn(...args), loading: false });
      } catch (err) {
        setState({ error: asApiError(err), loading: false });
      }
    },
    [fn],
  );

  return { ...state, run };
}
