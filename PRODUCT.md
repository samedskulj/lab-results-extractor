# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: a clinician (GP or doctor) who receives blood results from many different labs and formats, and uses this daily between appointments on a desktop monitor. Their job is to see in seconds what is critical or abnormal, trust each number, know where it came from, understand what pattern the results suggest, and explain them to the patient.

## Product Purpose

Turn any lab document (hospital report, US-units panel, GP referral letter, LIS export, OCR'd scan) into one standard format: canonical test names, SI units, reference ranges, low/high/critical flags, review warnings and a short clinical commentary. Every value is traceable to a verbatim quote in the source.

AI workflows on top of the standard format, all decision support and all grounded in the standardised results only:
- Explain: ranked likely explanations for the abnormal pattern, each with a plain-language strength of support (strong / moderate / weak, never a percentage), the results it rests on, and what was considered and ruled out.
- Ask: questions about the results, answered only from the extracted values, citing them.
- Patient letter: a plain-language draft for the doctor to edit and approve before it is used.

Success: the clinician reaches "what needs my attention" faster than reading the original, and never sees a value they can't verify.

## Positioning

The model only reads; deterministic code converts units and decides flags; every value must be backed by a quote that exists in the document, or it is flagged for review. Accuracy is measured against a hand-labelled golden set, compared with a rule-based baseline.

## Operating Context

- Input is pasted text or one of five built-in sample documents (`data/samples`). PDF and image input are not supported yet.
- Two engines: Claude (needs ANTHROPIC_API_KEY) and a rule-based baseline that also serves as offline mode.
- An "accuracy test" runs both engines against the golden set (5 documents, 50 labelled results).

## Capabilities and Constraints

- 19 analytes in the catalogue (`shared/catalogue.ts`); unknown tests pass through for review.
- Default reference ranges are adult and not sex-specific; ranges printed on the report take precedence.
- Commentary, explanations, answers and letters are decision support, not a diagnosis. Anything drafted for a patient needs the doctor's approval first.
- Claude responses are cached locally, so demos replay instantly.

## Evidence on Hand

- Baseline accuracy: 74% recall, 72% value accuracy, 74% flag accuracy on the golden set.
- Claude accuracy: to be measured with `npm run eval`. Do not quote numbers before then.
- All patients are fictional. There are no real customers, testimonials or clinical validation.

## Product Principles

1. Attention first: critical and abnormal results lead; normal results recede.
2. Show the evidence: every number links back to its source text.
3. Say what the system is doing and how sure it is, in plain clinical language rather than internal codes.
4. Never hide uncertainty: anything unverified is visibly marked for review.

## Accessibility & Inclusion

Flags must not rely on colour alone; text labels always accompany colour. Keyboard access is required for row selection.
