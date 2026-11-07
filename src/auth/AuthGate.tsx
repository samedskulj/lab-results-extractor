import type { Session } from "@supabase/supabase-js";
import { ArrowLeft, Eye, EyeOff, MailCheck, ShieldCheck } from "lucide-react";
import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { explainSupabaseError, supabase } from "../lib/supabase.ts";
import { Mark } from "../ui/Mark.tsx";

interface Auth {
  session: Session;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<Auth | null>(null);

/** The signed-in doctor, or null when Supabase isn't configured (local use, nothing saved remotely). */
export const useAuth = () => useContext(AuthContext);

type Mode = "sign-in" | "sign-up" | "forgot" | "new-password";
type Notice = { kind: "confirm" | "reset"; email: string };

const MIN_PASSWORD = 8;
const looksLikeEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim());

const COPY: Record<Mode, { title: string; description: string; button: string }> = {
  "sign-in": { title: "Sign in to Readout", description: "Use your work email and password.", button: "Sign in" },
  "sign-up": { title: "Create your account", description: "Your review ticks and approved letters are saved to it.", button: "Create account" },
  forgot: { title: "Reset your password", description: "We'll email you a link to choose a new one.", button: "Send reset link" },
  "new-password": { title: "Choose a new password", description: `At least ${MIN_PASSWORD} characters.`, button: "Save password" },
};

function PasswordInput({ id, value, onChange, autoComplete, invalid }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className="h-11 pr-11"
        required
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {shown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

function SignIn({ startAt, onPasswordChanged }: { startAt: Mode; onPasswordChanged: () => void }) {
  const [mode, setMode] = useState<Mode>(startAt);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<Notice>();
  const copy = COPY[mode];

  const go = (next: Mode) => {
    setMode(next);
    setError(undefined);
    setNotice(undefined);
    setPassword("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(undefined);
    if (mode !== "new-password" && !looksLikeEmail(email)) return setError("Enter a valid email address.");
    if (mode !== "forgot" && mode !== "sign-in" && password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);

    setBusy(true);
    const to = `${window.location.origin}/app`;
    const address = email.trim();
    try {
      if (mode === "sign-in") {
        const { error: err } = await supabase.auth.signInWithPassword({ email: address, password });
        if (err) setError(explainSupabaseError(err));
      } else if (mode === "sign-up") {
        const { data, error: err } = await supabase.auth.signUp({ email: address, password, options: { emailRedirectTo: to } });
        if (err) setError(explainSupabaseError(err));
        // With email confirmation on, there is no session until the link is opened.
        else if (!data.session) setNotice({ kind: "confirm", email: address });
      } else if (mode === "forgot") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: to });
        if (err) setError(explainSupabaseError(err));
        else setNotice({ kind: "reset", email: address });
      } else {
        const { error: err } = await supabase.auth.updateUser({ password });
        if (err) setError(explainSupabaseError(err));
        else onPasswordChanged();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="tw grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <a href="/" className="inline-flex w-fit items-center gap-2.5 font-heading text-lg font-bold tracking-tight text-foreground no-underline">
          <Mark />
          Readout
        </a>

        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">
          <Card className="gap-6 py-7 shadow-sm">
            {notice ? (
              <CardContent className="flex flex-col items-start gap-4 px-7" role="status">
                <span className="flex size-11 items-center justify-center rounded-full bg-[var(--mint-tint)] text-[var(--mint-ink)]">
                  <MailCheck className="size-5" aria-hidden />
                </span>
                <h1 className="font-heading text-2xl font-bold tracking-tight">Check your email</h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {notice.kind === "confirm" ? "We sent a confirmation link to " : "If an account exists for "}
                  <strong className="font-semibold text-foreground">{notice.email}</strong>
                  {notice.kind === "confirm" ? ". Open it, then sign in." : ", we sent a link to choose a new password."}
                </p>
                <Button variant="outline" onClick={() => go("sign-in")}>
                  Back to sign in
                </Button>
              </CardContent>
            ) : (
              <>
                <CardHeader className="gap-1.5 px-7">
                  <h1 className="font-heading text-2xl font-bold tracking-tight">{copy.title}</h1>
                  <CardDescription>{copy.description}</CardDescription>
                </CardHeader>
                <CardContent className="px-7">
                  <form onSubmit={(e) => void submit(e)} noValidate>
                    <FieldGroup className="gap-5">
                      {mode !== "new-password" && (
                        <Field data-invalid={error && !password ? true : undefined}>
                          <FieldLabel htmlFor="email">Work email</FieldLabel>
                          <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            autoFocus
                            placeholder="you@practice.nhs.uk"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-11"
                            required
                          />
                        </Field>
                      )}
                      {mode !== "forgot" && (
                        <Field data-invalid={error ? true : undefined}>
                          <div className="flex items-center justify-between gap-3">
                            <FieldLabel htmlFor="password">{mode === "new-password" ? "New password" : "Password"}</FieldLabel>
                            {mode === "sign-in" && (
                              <button type="button" onClick={() => go("forgot")} className="rounded text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                                Forgot password?
                              </button>
                            )}
                          </div>
                          <PasswordInput
                            id="password"
                            value={password}
                            onChange={setPassword}
                            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                            invalid={Boolean(error)}
                          />
                          {mode === "sign-up" && <FieldDescription>At least {MIN_PASSWORD} characters.</FieldDescription>}
                        </Field>
                      )}
                      {error && <FieldError role="alert">{error}</FieldError>}
                      <Button type="submit" size="lg" className="h-11 w-full" disabled={busy}>
                        {busy && <Spinner />}
                        {copy.button}
                      </Button>
                    </FieldGroup>
                  </form>

                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    {mode === "sign-in" ? (
                      <>
                        New to Readout?{" "}
                        <button type="button" onClick={() => go("sign-up")} className="rounded font-medium text-primary underline-offset-4 hover:underline">
                          Create an account
                        </button>
                      </>
                    ) : mode === "new-password" ? null : (
                      <>
                        {mode === "sign-up" ? "Already have an account?" : "Remembered it?"}{" "}
                        <button type="button" onClick={() => go("sign-in")} className="rounded font-medium text-primary underline-offset-4 hover:underline">
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                </CardContent>
              </>
            )}
          </Card>
        </div>

        <a href="/" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden /> Back to Readout
        </a>
      </div>

      <aside
        className="relative hidden flex-col justify-end overflow-hidden p-12 text-white lg:flex"
        style={{ background: "linear-gradient(150deg, #1a3fa8 0%, #2b5ce6 45%, #12a994 120%)" }}
        aria-hidden
      >
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <ShieldCheck className="mb-6 size-9 text-white/80" />
        <p className="max-w-md font-heading text-3xl font-bold leading-tight tracking-tight">Every number links back to the line it came from.</p>
        <p className="mt-4 max-w-md text-base leading-relaxed text-white/80">
          Photograph or upload any lab report. Readout standardises the units and ranges, puts critical results first, and marks anything it could not verify.
        </p>
      </aside>
    </main>
  );
}

/** Ask for sign-in before the dashboard when Supabase is configured; pass straight through when it isn't. */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabase) return <>{children}</>;
  if (session === undefined) {
    return (
      <main className="tw flex min-h-screen items-center justify-center bg-background" aria-busy="true">
        <Spinner className="size-6 text-muted-foreground" aria-label="Loading" />
      </main>
    );
  }
  if (!session || recovering) return <SignIn startAt={recovering ? "new-password" : "sign-in"} onPasswordChanged={() => setRecovering(false)} />;
  return <AuthContext.Provider value={{ session, signOut: async () => void (await supabase!.auth.signOut()) }}>{children}</AuthContext.Provider>;
}
