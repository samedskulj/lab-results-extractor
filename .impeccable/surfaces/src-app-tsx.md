---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Lab Results · clinical workspace

Scope: the single-page app (worklist shell, case workspace with Document · Results · Explain · Patient letter steps, Ask panel, "How it works" view). Mode: Operate.
Audience: a doctor (GP) using it daily between appointments on a desktop monitor in a daylit clinic room. Job: from any incoming lab document to "what needs my attention, why, and what do I tell the patient", with every value verifiable.
Constraints: text input only; Claude when an API key works, rule-based engine otherwise (and said so); decision support, not diagnosis; no invented confidence percentages.
Inspiration (user-pinned): the Dribbble concept "AETIO: Clinical Root-Cause AI" (calm blue + mint palette, sidebar app shell, step tracker, pipeline card, root-cause view with ruled-out panel). Taken as palette, type, density and one signature move; brand, logo and copy are not reused.
Unresolved: Claude accuracy numbers are pending API credit.

## Direction contract

THESIS: A lab inbox that reasons in the open. Each incoming document becomes a case the doctor walks through in four steps, and every AI statement is visibly threaded back to the results and quotes it rests on. It refuses the category default: a flat results table with an AI paragraph bolted underneath.

OWN-WORLD: Cool clinical daylight. Ground #F2F5FA, white panels with soft offset shadows, a pale sidebar layer, ink navy. Clinical blue carries actions and selection; mint marks AI-authored material (AI chips, the AI button's blue-to-mint fill, thread lines). State colours: coral-red critical, amber outside range, violet "check against the original", teal in range, always with an icon and label. Geist for all UI and data with tabular figures, Instrument Serif only for AI headlines, JetBrains Mono only for quoted source text.

STORY: The doctor opens a patient from the worklist and watches the real pipeline (Read, Standardise, Verify, Summarise) finish with counts. They land on what needs attention, click any value to see its quote in the original, move to Explain to see ranked likely explanations threaded to the results behind them plus what was ruled out, ask follow-up questions, and approve a plain-language patient letter.

FIRST VIEWPORT: Left sidebar (248px): wordmark, nav (Worklist, How it works), "Incoming" list of the five documents with patient name and status dot, "New document" button. Main: top bar with breadcrumb and engine chip; case header card with initials avatar, patient name, detail chips and the 4-step tracker on the right, "Ask about these results" button. Below, Results step: attention strip with counts, grouped result rows (value, fixed-scale range bar, flag label, source link) at 7/12, original document with highlighted quotes and the AI summary at 5/12.

FORM: user-pinned direction (AETIO Clinical Root-Cause AI concept, Dribbble), translated to this product · seed: none (pinned by user, no roll)
Signature move: evidence threads. On Explain, curved mint lines run from each cited result to the explanation it supports; hovering or selecting either end lights its threads, and any result opens its source quote.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
