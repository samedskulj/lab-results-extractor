import type { Session } from "@supabase/supabase-js";
import { ArrowLeft, LoaderCircle, MailCheck } from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { explainSupabaseError, supabase } from "../lib/supabase.ts";
import { Mark } from "../ui/Mark.tsx";
import { Button } from "../ui/index.ts";

interface Auth {
  session: Session;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<Auth | null>(null);

/** The signed-in doctor, or null when Supabase isn't configured (local use, nothing saved remotely). */
export const useAuth = () => useContext(AuthContext);

function SignIn() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ status: "idle" | "sending" | "sent" | "error"; message?: string }>({ status: "idle" });

  const send = async () => {
    if (!supabase) return;
    setState({ status: "sending" });
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/app` } });
    setState(error ? { status: "error", message: explainSupabaseError(error) } : { status: "sent" });
  };

  return (
    <main className="signin">
      <section className="panel signin-card" aria-labelledby="signin-title">
        <a className="brand" href="/">
          <Mark />
          <span className="brand-name">Readout</span>
        </a>
        {state.status === "sent" ? (
          <div className="signin-sent" role="status">
            <MailCheck size={28} aria-hidden />
            <h1 id="signin-title">Check your email</h1>
            <p>
              We sent a sign-in link to <strong>{email.trim()}</strong>. Open it on this device to go straight to your worklist.
            </p>
            <Button variant="quiet" onClick={() => setState({ status: "idle" })}>
              Use a different email
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <h1 id="signin-title">Sign in to your worklist</h1>
            <p className="muted">No password: we email you a one-time link. Your review ticks and approved letters are saved to your account.</p>
            <label className="field signin-field">
              <span className="field-label">Work email</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@practice.nhs.uk" />
            </label>
            {state.status === "error" && (
              <p className="signin-error" role="alert">
                {state.message}
              </p>
            )}
            <Button type="submit" className="signin-btn" loading={state.status === "sending"} disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}>
              Email me a sign-in link
            </Button>
          </form>
        )}
      </section>
      <a className="signin-back" href="/">
        <ArrowLeft size={14} aria-hidden /> Back to Readout
      </a>
    </main>
  );
}

/** Ask for sign-in before the dashboard when Supabase is configured; pass straight through when it isn't. */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabase) return <>{children}</>;
  if (session === undefined) {
    return (
      <main className="signin" aria-busy="true">
        <LoaderCircle className="spin" size={24} aria-label="Loading" />
      </main>
    );
  }
  if (!session) return <SignIn />;
  return (
    <AuthContext.Provider value={{ session, signOut: async () => void (await supabase!.auth.signOut()) }}>{children}</AuthContext.Provider>
  );
}
