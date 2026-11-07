"use client";

import { CircleCheck, LoaderCircle, Send } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { explainSupabaseError, supabase } from "@/lib/supabase";

const EMPTY = { name: "", email: "", practice: "", message: "" };

/** "Talk to us": stored in Supabase, readable only from the Supabase dashboard. */
export function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState<{ status: "idle" | "sending" | "sent" | "error"; message?: string }>({ status: "idle" });
  const valid = form.name.trim().length > 0 && /^\S+@\S+\.\S+$/.test(form.email.trim());
  const set = (k: keyof typeof EMPTY) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!supabase) return setState({ status: "error", message: "The contact form isn't connected yet." });
    setState({ status: "sending" });
    const { error } = await supabase.from("contact_requests").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      practice: form.practice.trim() || null,
      message: form.message.trim() || null,
    });
    if (error) return setState({ status: "error", message: explainSupabaseError(error) });
    setState({ status: "sent" });
    setForm(EMPTY);
  };

  if (state.status === "sent") {
    return (
      <div className="flex flex-col items-start gap-3 py-6" role="status">
        <CircleCheck className="size-7 text-mint" aria-hidden />
        <p>
          <strong className="font-semibold">Thanks, we&apos;ve got it.</strong> We&apos;ll reply by email.
        </p>
        <Button variant="outline" onClick={() => setState({ status: "idle" })}>
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form
      className="grid gap-5 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="c-name">Name</Label>
        <Input id="c-name" required autoComplete="name" value={form.name} onChange={set("name")} maxLength={200} className="h-10 bg-card" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="c-email">Work email</Label>
        <Input id="c-email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} maxLength={320} className="h-10 bg-card" />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="c-practice">
          Practice or organisation <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input id="c-practice" autoComplete="organization" value={form.practice} onChange={set("practice")} maxLength={200} className="h-10 bg-card" />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="c-message">
          What would you like to try? <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="c-message"
          rows={4}
          value={form.message}
          onChange={set("message")}
          maxLength={4000}
          placeholder="Please don't include patient details."
          className="resize-y bg-card"
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2">
        {state.status === "error" && (
          <p className="mr-auto text-sm text-critical-ink" role="alert">
            {state.message}
          </p>
        )}
        <Button type="submit" size="lg" disabled={!valid || state.status === "sending"} aria-busy={state.status === "sending" || undefined}>
          {state.status === "sending" ? <LoaderCircle className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          Send
        </Button>
      </div>
    </form>
  );
}
