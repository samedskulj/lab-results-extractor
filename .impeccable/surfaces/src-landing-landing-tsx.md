---
version: 1
slug: "src-landing-landing-tsx"
primary_target: "src/landing/Landing.tsx"
related_targets: []
---

# Readout · landing page

Scope: the public landing page at `/` (index.html → src/landing). Mode: Persuade.
Audience: GPs first (they open the dashboard and try the five fictional sample patients); clinics and practice managers second ("Talk to us", placeholder contact for now).
Job: in one viewport, a doctor understands that Readout turns any lab document into checked, prioritised results with explanations they can verify, and opens the dashboard.
Proof on hand: the working dashboard with five fictional sample documents. No customers, testimonials, clinical validation or accuracy numbers may be claimed.
Constraints: shares the dashboard's world (cool clinical daylight); decision support, not a diagnosis; contact link is a placeholder to replace.

## Direction contract

THESIS: Trust is the product. The page opens on one result magnified and visibly threaded back to the exact line of the original report it came from. It refuses the category default: a headline over a dashboard screenshot and a row of feature cards.

OWN-WORLD: The dashboard's cool clinical daylight at page scale. Ground #F2F5FA with white document sheets, navy ink, clinical blue for actions, mint threads for evidence, coral-red only for the critical value. Instrument Serif sets the headlines, Geist everything else with tabular figures, JetBrains Mono only for quoted report text.

STORY: A GP sees a critical potassium traced to its source line, switches to another value and watches the thread move, reads how the four steps work and what the AI never does, sees an explanation and a patient letter that need their approval, then opens the dashboard.

FIRST VIEWPORT: Top bar with the Readout mark, three anchor links, "Talk to us" and "Open dashboard". Left 5/12: serif headline, one-sentence offer, both actions. Right 7/12: an evidence board with a magnified result card (value, unit, flag, range bar) and an excerpt of the fictional LIS export, joined by a mint thread to the highlighted quote. Value chips beneath switch the traced result.

FORM: candidate 7 of 7 (evidence-first trust page) · seed: bca4d6c15db06c31
Signature move: the evidence thread, carried from the dashboard's Explain step to the hero. Choosing a value redraws its thread to the matching line of the original.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
