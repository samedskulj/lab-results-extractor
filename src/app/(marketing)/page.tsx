import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Database,
  FileText,
  FlaskConical,
  Mail,
  PenLine,
  ScanLine,
  ShieldCheck,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { ContactForm } from "@/components/landing/contact-form";
import { Brand } from "@/components/landing/brand";
import { EvidenceBoard } from "@/components/landing/evidence-board";
import { APP_URL, CONTACT_URL, NAV } from "@/components/landing/links";
import { SiteHeader } from "@/components/landing/site-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FORMATS: { name: string; hard: string; does: string; Icon: LucideIcon }[] = [
  { name: "Hospital lab report", hard: "Fixed-width columns and printed ranges", does: "Reads values as printed and keeps the lab's own ranges", Icon: FileText },
  { name: "US lab panel", hard: "mg/dL and % units", does: "Converts to SI units with fixed, published factors", Icon: FlaskConical },
  { name: "GP referral letter", hard: "Results buried in prose, old values quoted for comparison", does: "Takes current values only and ignores the history", Icon: Mail },
  { name: "Lab-system export", hard: "Codes like K+ and flags like HH", does: "Maps codes to standard test names and flags", Icon: Database },
  { name: "Scanned report", hard: "OCR noise: 0 for O, 1 for l", does: "Marks any value whose quote doesn't match to check by hand", Icon: ScanLine },
];

const STEPS = [
  { title: "Document", text: "Read once. Every result is copied with the exact quote it came from, and every quote is checked against the page." },
  { title: "Results", text: "Critical first, then outside range. Each value sits on the same range scale and opens its source line in one click." },
  { title: "Explain", text: "Likely explanations for the pattern, each threaded to the results it rests on, with what's less likely and what to check next." },
  { title: "Patient letter", text: "A plain-language draft with checks for every out-of-range result. Nothing is used until you approve it." },
];

const DOES = ["Reads the document and quotes each result it finds", "Drafts summaries, explanations and letters from checked values only", "Answers your questions and names the results it used"];
const NEVER = [
  ["Converts units or decides flags", "fixed clinical rules do that"],
  ["Shows a value without its quote", "it's marked to check against the original instead"],
  ["Sends anything to a patient", "you approve every letter first"],
  ["Diagnoses", "it's decision support for your judgement"],
];

const FAQ = [
  {
    q: "Is Readout a diagnostic tool?",
    a: "No. Readout is decision support. Summaries, explanations, answers and patient letters are drafts for your clinical judgement, and every letter needs your approval before it is used.",
  },
  {
    q: "Which documents can it read?",
    a: "Hospital lab reports, US-unit panels, GP referral letters, lab-system exports and scans. Upload a photo or PDF, or paste the text, and choose the report's country so units, decimals and dates are read the way they are printed.",
  },
  {
    q: "How do I know a value is right?",
    a: "Every value carries the verbatim quote it was read from, and that quote is checked against the document. If the quote can't be found, the value is marked for you to check against the original.",
  },
  {
    q: "What happens if the AI is unavailable?",
    a: "Readout tells you plainly and lets you try again. It never substitutes a guess: a document is only shown once every value has been read and checked against the original.",
  },
  {
    q: "Which units and reference ranges does it use?",
    a: "Results are shown in SI units, converted with fixed, published factors. Ranges printed on the report take precedence; otherwise Readout uses default adult ranges, which are not sex-specific.",
  },
];

function SectionHeading({ eyebrow, title, lead, className }: { eyebrow: string; title: ReactNode; lead?: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto mb-12 flex max-w-2xl flex-col items-center text-center", className)}>
      <Badge variant="outline" className="mb-4 rounded-full border-mint/30 bg-mint-tint px-3 py-1 text-mint-ink">
        {eyebrow}
      </Badge>
      <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">{title}</h2>
      {lead && <p className="mt-4 text-lg text-pretty text-ink-2">{lead}</p>}
    </div>
  );
}

function SupportBars({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span key={i} className={cn("h-1.5 w-3.5 rounded-sm", i <= level ? "bg-mint" : "bg-border")} />
      ))}
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section aria-labelledby="hero-title" className="relative isolate">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(1100px_520px_at_80%_-10%,#dfe9fd_0%,transparent_70%),radial-gradient(800px_460px_at_-10%_35%,#e1f4ef_0%,transparent_65%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#0b162808_1px,transparent_1px),linear-gradient(to_bottom,#0b162808_1px,transparent_1px)] mask-[radial-gradient(ellipse_70%_60%_at_50%_0%,#000_40%,transparent_100%)] bg-size-[48px_48px]"
          />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:pt-20 lg:pb-28">
            <div>
              <h1 id="hero-title" className="font-heading text-[2.75rem] leading-[1.02] font-bold tracking-tight text-balance sm:text-6xl lg:text-[4.25rem]">
                Every lab value, traced to the line it came from.
              </h1>
              <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-pretty text-ink-2">
                Readout reads hospital reports, US panels, referral letters, lab exports and scans. It puts critical results first and shows the exact quote
                behind every number, so you can trust what you act on.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 rounded-xl px-6 text-base">
                  <a href={APP_URL}>
                    Open dashboard <ArrowRight aria-hidden />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-xl bg-card px-6 text-base">
                  <a href={CONTACT_URL}>Talk to us</a>
                </Button>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-3">
                {["Sign in with email and password", "Decision support, not a diagnosis"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="size-4 text-mint" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <EvidenceBoard />
          </div>
        </section>

        {/* Formats */}
        <section id="formats" aria-labelledby="formats-title" className="scroll-mt-16 border-t bg-card py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Documents"
              title={<span id="formats-title">Whatever lands in your inbox</span>}
              lead="Five kinds of document, one standard view: canonical test names, SI units, reference ranges and flags."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {FORMATS.map((f, i) => (
                <Card key={f.name} className={cn("gap-0 rounded-2xl bg-background py-0 shadow-none", i < 2 ? "lg:col-span-3" : "lg:col-span-2")}>
                  <CardContent className="flex h-full flex-col p-6">
                    <span className="mb-5 grid size-10 place-items-center rounded-lg border bg-card text-primary shadow-xs">
                      <f.Icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="font-heading text-xl font-bold tracking-tight">{f.name}</h3>
                    <p className="mt-1.5 text-sm text-ink-3">{f.hard}</p>
                    <p className="mt-auto flex items-start gap-2 border-t pt-4 text-[0.9375rem] text-foreground [&]:mt-5">
                      <ArrowRight className="mt-1 size-4 shrink-0 text-mint" aria-hidden /> {f.does}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" aria-labelledby="workflow-title" className="scroll-mt-16 border-t py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Workflow"
              title={<span id="workflow-title">Four steps, in the order you&apos;d work</span>}
              lead="Each case moves through the same steps, and you can see where it is at a glance."
            />
            <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              <span aria-hidden className="absolute top-5 right-[12.5%] left-[12.5%] hidden h-0.5 bg-linear-to-r from-primary/50 via-mint/60 to-mint/50 lg:block" />
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative flex flex-col items-start lg:items-center lg:text-center">
                  <span className="relative z-[1] grid size-10 place-items-center rounded-full bg-mint font-heading text-base font-bold text-white ring-6 ring-background">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 font-heading text-xl font-bold tracking-tight">{s.title}</h3>
                  <p className="mt-2 max-w-[34ch] text-[0.9375rem] text-ink-2">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Trust */}
        <section id="trust" aria-labelledby="trust-title" className="scroll-mt-16 border-t bg-card py-20 lg:py-28">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Trust"
              title={<span id="trust-title">What the AI does, and what it never does</span>}
              lead="The AI reads and writes prose. Fixed clinical rules set units, ranges and flags, and every value is checked against the original."
            />
            <div className="grid overflow-hidden rounded-2xl border md:grid-cols-2">
              <div className="p-7 sm:p-8">
                <h3 className="mb-5 flex items-center gap-2 font-heading text-xl font-bold tracking-tight">
                  <span className="grid size-8 place-items-center rounded-lg bg-mint-tint text-mint-ink">
                    <Sparkles className="size-4" aria-hidden />
                  </span>
                  The AI
                </h3>
                <ul className="grid gap-3.5">
                  {DOES.map((d) => (
                    <li key={d} className="flex gap-2.5 text-ink-2">
                      <Check className="mt-1 size-4 shrink-0 text-mint" aria-hidden /> {d}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t bg-background p-7 sm:p-8 md:border-t-0 md:border-l">
                <h3 className="mb-5 flex items-center gap-2 font-heading text-xl font-bold tracking-tight">
                  <span className="grid size-8 place-items-center rounded-lg bg-critical-tint text-critical-ink">
                    <X className="size-4" aria-hidden />
                  </span>
                  It never
                </h3>
                <ul className="grid gap-3.5">
                  {NEVER.map(([never, instead]) => (
                    <li key={never} className="flex gap-2.5 text-ink-2">
                      <X className="mt-1 size-4 shrink-0 text-critical/70" aria-hidden />
                      <span>
                        <strong className="font-semibold text-foreground">{never}</strong>: {instead}.
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Showcase */}
        <section id="explain" aria-labelledby="explain-title" className="scroll-mt-16 border-t py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Explain and write"
              title={<span id="explain-title">From results to what you tell the patient</span>}
              lead="Explanations rest on the results they cite. Letters stay drafts until you approve them."
            />
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="gap-0 rounded-2xl py-0 shadow-soft">
                <CardContent className="p-6 sm:p-7">
                  <p className="mb-4 text-[0.8125rem] font-semibold text-ink-3">Explain</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full bg-mint text-xs font-bold text-white">1</span>
                    <h3 className="font-heading text-2xl font-bold tracking-tight">Reduced kidney function</h3>
                    <span className="ml-auto inline-flex items-center gap-2 text-[0.8125rem] font-medium text-mint-ink">
                      <SupportBars level={3} /> Strong support
                    </span>
                  </div>
                  <p className="mt-3 text-ink-2">
                    Creatinine 131 µmol/L is raised and eGFR 39 is reduced. A single result can&apos;t separate a sudden drop from long-standing disease.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {[
                      { name: "Creatinine", value: 131, Icon: ChevronUp },
                      { name: "eGFR", value: 39, Icon: ChevronDown },
                    ].map((c) => (
                      <span key={c.name} className="inline-flex items-center gap-1.5 rounded-lg border bg-card py-1 pr-2.5 pl-2 text-[0.8125rem]">
                        <c.Icon className="size-3.5 text-outside-ink" aria-hidden />
                        <span className="font-medium">{c.name}</span>
                        <span className="font-bold text-outside-ink">{c.value}</span>
                        <span className="sr-only">(outside range)</span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 rounded-xl bg-background p-4">
                    <h4 className="text-sm font-semibold">To confirm</h4>
                    <ul className="mt-2 grid gap-1.5 text-sm text-ink-2">
                      {["Repeat U&E and eGFR, compare with earlier results", "Urine albumin:creatinine ratio", "Review nephrotoxic medication"].map((x) => (
                        <li key={x} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-mint" aria-hidden />
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="gap-0 rounded-2xl py-0 shadow-soft">
                <CardContent className="p-6 sm:p-7">
                  <p className="mb-4 flex flex-wrap items-center gap-2.5 text-[0.8125rem] font-semibold text-ink-3">
                    Patient letter
                    <Badge variant="outline" className="rounded-full border-check/25 bg-check-tint text-check-ink">
                      <PenLine aria-hidden /> Draft: needs your approval
                    </Badge>
                  </p>
                  <p className="rounded-xl border bg-background p-5 leading-relaxed">
                    Dear Eleanor,
                    <br />
                    <br />
                    Your recent blood test results are back. Most were normal, but your kidney tests show they are working a little less well than usual. This
                    doesn&apos;t mean something is seriously wrong. I&apos;d like to repeat them in two weeks.
                  </p>
                  <ul className="mt-4 grid gap-2 text-sm">
                    {["Mentions creatinine and eGFR", "Short sentences: 12 words on average"].map((x) => (
                      <li key={x} className="flex items-center gap-2 text-ink-2">
                        <CircleCheck className="size-4 text-mint" aria-hidden /> {x}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-16 border-t bg-card py-20 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div>
              <Badge variant="outline" className="mb-4 rounded-full border-mint/30 bg-mint-tint px-3 py-1 text-mint-ink">
                FAQ
              </Badge>
              <h2 id="faq-title" className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Questions doctors ask first
              </h2>
              <p className="mt-4 text-lg text-ink-2">
                Something else on your mind?{" "}
                <a href={CONTACT_URL} className="font-medium text-blue-ink underline underline-offset-4">
                  Ask us directly
                </a>
                .
              </p>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((f, i) => (
                <AccordionItem key={f.q} value={`q${i}`}>
                  <AccordionTrigger className="py-5 text-base font-semibold hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-[0.9375rem] leading-relaxed text-ink-2">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section aria-labelledby="cta-title" className="px-4 py-20 sm:px-6 lg:py-24">
          <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-3xl bg-foreground px-6 py-16 text-center sm:px-12 lg:py-20">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-[radial-gradient(700px_320px_at_85%_0%,rgb(18_169_148/0.35),transparent_70%),radial-gradient(600px_300px_at_10%_100%,rgb(43_92_230/0.45),transparent_70%)]"
            />
            <ShieldCheck className="mx-auto mb-5 size-9 text-mint" aria-hidden />
            <h2 id="cta-title" className="font-heading text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Read your first report in seconds.
            </h2>
            <p className="mx-auto mt-4 max-w-[58ch] text-lg text-white/75">
              Photograph a report and see what needs attention, with every value traced to its line. Running a practice? Talk to us about trying
              Readout.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-xl bg-white px-6 text-base text-foreground hover:bg-white/90">
                <a href={APP_URL}>
                  Open dashboard <ArrowRight aria-hidden />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-white/25 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white">
                <a href={CONTACT_URL}>Talk to us</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" aria-labelledby="contact-title" className="scroll-mt-16 border-t py-20 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div>
              <Badge variant="outline" className="mb-4 rounded-full border-mint/30 bg-mint-tint px-3 py-1 text-mint-ink">
                Contact
              </Badge>
              <h2 id="contact-title" className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Talk to us
              </h2>
              <p className="mt-4 max-w-[44ch] text-lg text-ink-2">
                Running a practice or a clinical team? Tell us what you&apos;d like to try and we&apos;ll reply by email.
              </p>
            </div>
            <Card className="rounded-2xl py-0 shadow-soft">
              <CardContent className="p-6 sm:p-8">
                <ContactForm />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <Brand size={24} />
            <p className="text-sm text-ink-3">Decision support, not a diagnosis. Patients shown on this page are fictional.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {[...NAV, { href: APP_URL, label: "Dashboard" }, { href: CONTACT_URL, label: "Contact" }].map((n) => (
              <a key={n.href} href={n.href} className="text-ink-2 hover:text-foreground">
                {n.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
