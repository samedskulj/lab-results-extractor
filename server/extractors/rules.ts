import { ANALYTES, type AnalyteId } from "../../shared/catalogue.ts";
import type { Answer, CommentaryResult, Explanation, Letter, Support } from "../../shared/types.ts";
import { isAbnormal, isCritical } from "./types.ts";

/**
 * Rule-based explain / ask / letter for the offline engine. A handful of well-known
 * patterns, deliberately conservative; the UI labels all of it "rule-based, no AI".
 */

type Known = CommentaryResult & { analyte_id: AnalyteId; value: number };
type Lookup = Partial<Record<AnalyteId, Known>>;

const index = (results: CommentaryResult[]): Lookup => {
  const out: Lookup = {};
  for (const r of results) if (r.analyte_id !== "unknown" && r.value !== null && !out[r.analyte_id]) out[r.analyte_id] = r as Known;
  return out;
};

const high = (r?: Known) => r?.flag === "high" || r?.flag === "critical_high";
const low = (r?: Known) => r?.flag === "low" || r?.flag === "critical_low";
const normal = (r?: Known) => r?.flag === "normal";
const v = (r: Known) => `${r.name} ${r.value} ${r.unit}`;
const ids = (...rs: (Known | undefined)[]) => rs.filter((r): r is Known => Boolean(r)).map((r) => r.analyte_id);

interface Rule {
  title: string;
  /** Returns the support and the cited results, or null when the pattern isn't there. */
  match: (l: Lookup) => { support: Support; cited: (Known | undefined)[]; reasoning: string } | null;
  to_confirm: string[];
}

const RULES: Rule[] = [
  {
    title: "Hyperkalaemia",
    match: ({ potassium: k, creatinine, egfr }) =>
      high(k) && k
        ? {
            support: isCritical(k) || k.value >= 6 ? "strong" : "moderate",
            cited: [k, high(creatinine) ? creatinine : undefined, low(egfr) ? egfr : undefined],
            reasoning: `${v(k)} is above the range. Rule out a haemolysed or delayed sample before acting on it${high(creatinine) || low(egfr) ? "; reduced kidney function may contribute" : ""}.`,
          }
        : null,
    to_confirm: ["Urgent repeat potassium (unhaemolysed sample)", "ECG if potassium is 6.0 mmol/L or more", "Review ACE inhibitors, ARBs, spironolactone"],
  },
  {
    title: "Reduced kidney function",
    match: ({ creatinine, egfr }) =>
      high(creatinine) || low(egfr)
        ? {
            support: high(creatinine) && low(egfr) ? "strong" : "moderate",
            cited: [high(creatinine) ? creatinine : undefined, low(egfr) ? egfr : undefined],
            reasoning: [creatinine && high(creatinine) && `${v(creatinine)} is raised`, egfr && low(egfr) && `${v(egfr)} is reduced`]
              .filter(Boolean)
              .join(" and ")
              .concat(". A single result can't separate a sudden drop from long-standing kidney disease."),
          }
        : null,
    to_confirm: ["Repeat U&E and eGFR, compare with earlier results", "Urine albumin:creatinine ratio", "Review nephrotoxic medication"],
  },
  {
    title: "Iron-deficiency anaemia",
    match: ({ haemoglobin: hb, ferritin }) =>
      low(ferritin) && ferritin
        ? {
            support: low(hb) ? "strong" : "moderate",
            cited: [low(hb) ? hb : undefined, ferritin],
            reasoning: low(hb) && hb
              ? `${v(hb)} with ${v(ferritin)} fits iron deficiency as the cause of the anaemia.`
              : `${v(ferritin)} shows low iron stores, though haemoglobin is not yet below range.`,
          }
        : null,
    to_confirm: ["Ask about blood loss and diet", "Coeliac serology", "Consider GI investigation if no clear cause"],
  },
  {
    title: "Anaemia, cause not shown",
    match: ({ haemoglobin: hb, ferritin }) =>
      low(hb) && hb && !low(ferritin)
        ? isCritical(hb)
          ? { support: "strong", cited: [hb], reasoning: `${v(hb)} is critically low and needs same-day review; these results don't show the cause.` }
          : { support: "weak", cited: [hb], reasoning: `${v(hb)} is low, but these results don't show why.` }
        : null,
    to_confirm: ["Same-day clinical review if critically low", "Full blood count with MCV", "Ferritin, B12 and folate"],
  },
  {
    title: "Possible sepsis or significant infection",
    match: ({ crp, wbc }) =>
      high(crp) && crp && crp.value >= 50
        ? { support: high(wbc) ? "strong" : "moderate", cited: [crp, high(wbc) ? wbc : undefined], reasoning: `${v(crp)} is markedly raised${high(wbc) && wbc ? ` with ${v(wbc)}` : ""}, which points to significant inflammation or infection.` }
        : null,
    to_confirm: ["Clinical assessment for a source of infection", "Observations (NEWS2)", "Blood cultures if unwell"],
  },
  {
    title: "Mild inflammation",
    match: ({ crp }) =>
      high(crp) && crp && crp.value < 50 ? { support: "weak", cited: [crp], reasoning: `${v(crp)} is mildly raised; it is non-specific.` } : null,
    to_confirm: ["Repeat CRP in 2 to 4 weeks", "Look for an inflammatory or infective cause"],
  },
  {
    title: "Primary hypothyroidism",
    match: ({ tsh, free_t4: t4 }) =>
      high(tsh) && tsh
        ? {
            support: low(t4) ? "strong" : "moderate",
            cited: [tsh, low(t4) ? t4 : undefined],
            reasoning: low(t4) && t4 ? `${v(tsh)} with ${v(t4)} is the typical pattern.` : `${v(tsh)} is raised; with a normal or missing free T4 this may be subclinical.`,
          }
        : null,
    to_confirm: ["Repeat TSH and free T4 in 6 to 8 weeks", "Thyroid peroxidase antibodies"],
  },
  {
    title: "Overactive thyroid",
    match: ({ tsh, free_t4: t4 }) =>
      low(tsh) && tsh ? { support: high(t4) ? "strong" : "weak", cited: [tsh, high(t4) ? t4 : undefined], reasoning: `${v(tsh)} is suppressed${high(t4) && t4 ? ` with ${v(t4)}` : ""}.` } : null,
    to_confirm: ["Free T3", "Review thyroxine dose if on treatment"],
  },
  {
    title: "Diabetes range glucose",
    match: ({ hba1c, glucose }) =>
      (hba1c && hba1c.value >= 48) || (high(glucose) && glucose && glucose.value >= 11.1)
        ? { support: hba1c && hba1c.value >= 48 ? "strong" : "moderate", cited: [high(hba1c) ? hba1c : undefined, high(glucose) ? glucose : undefined], reasoning: [hba1c && hba1c.value >= 48 && `${v(hba1c)} is in the diabetes range (48 or more)`, glucose && high(glucose) && `${v(glucose)} is raised`].filter(Boolean).join("; ") + "." }
        : null,
    to_confirm: ["Repeat HbA1c to confirm if no symptoms", "Urine ketones if glucose is very high"],
  },
  {
    title: "Raised blood sugar below the diabetes range",
    match: ({ hba1c }) => (hba1c && high(hba1c) && hba1c.value < 48 ? { support: "moderate", cited: [hba1c], reasoning: `${v(hba1c)} is in the 42 to 47 range often called prediabetes.` } : null),
    to_confirm: ["Annual HbA1c", "Lifestyle advice"],
  },
  {
    title: "Raised cholesterol",
    match: ({ cholesterol, ldl, triglycerides, hdl }) =>
      high(ldl) || high(cholesterol) || high(triglycerides)
        ? { support: high(ldl) ? "strong" : "moderate", cited: [high(cholesterol) ? cholesterol : undefined, high(ldl) ? ldl : undefined, high(triglycerides) ? triglycerides : undefined, low(hdl) ? hdl : undefined], reasoning: "Lipids are above the target range; overall risk depends on age, blood pressure and smoking." }
        : null,
    to_confirm: ["QRISK3 cardiovascular risk score", "Repeat fasting lipids if triglycerides are high"],
  },
  {
    title: "Low sodium",
    match: ({ sodium }) => (low(sodium) && sodium ? { support: isCritical(sodium) || sodium.value < 125 ? "strong" : "moderate", cited: [sodium], reasoning: `${v(sodium)} is below range.` } : null),
    to_confirm: ["Review diuretics and SSRIs", "Serum osmolality, urine sodium"],
  },
  {
    title: "Low platelets",
    match: ({ platelets }) => (low(platelets) && platelets ? { support: "moderate", cited: [platelets], reasoning: `${v(platelets)} is below range.` } : null),
    to_confirm: ["Repeat full blood count with blood film"],
  },
  {
    title: "Liver cell irritation",
    match: ({ alt }) => (high(alt) && alt ? { support: alt.value > 120 ? "moderate" : "weak", cited: [alt], reasoning: `${v(alt)} is raised; alcohol, fatty liver and medication are the common causes.` } : null),
    to_confirm: ["Repeat liver function tests", "Ask about alcohol and medication"],
  },
  {
    title: "Vitamin D deficiency",
    match: ({ vitamin_d: d }) => (low(d) && d ? { support: d.value < 25 ? "strong" : "moderate", cited: [d], reasoning: `${v(d)} is below the sufficiency threshold.` } : null),
    to_confirm: ["Consider supplementation"],
  },
];

const RULED_OUT: { title: string; check: (l: Lookup) => (Known | undefined)[] | null }[] = [
  { title: "Thyroid disorder", check: ({ tsh }) => (normal(tsh) ? [tsh] : null) },
  { title: "Kidney impairment", check: ({ creatinine, egfr }) => (normal(creatinine) && (!egfr || normal(egfr)) ? [creatinine, egfr] : null) },
  { title: "Anaemia", check: ({ haemoglobin }) => (normal(haemoglobin) ? [haemoglobin] : null) },
  { title: "Significant inflammation", check: ({ crp }) => (normal(crp) ? [crp] : null) },
  { title: "Diabetes", check: ({ hba1c }) => (normal(hba1c) ? [hba1c] : null) },
];

const SUPPORT_ORDER: Record<Support, number> = { strong: 0, moderate: 1, weak: 2 };

export function explainByRules(results: CommentaryResult[]): Explanation {
  const l = index(results);
  const citesCritical = (analyteIds: AnalyteId[]) => analyteIds.some((id) => isCritical(l[id] ?? { flag: "normal" }));
  // Explanations resting on a critical result lead, then by strength of support. Results the shown
  // explanations don't cover are listed on the Explain page as "not explained", never dropped silently.
  const explanations = RULES.flatMap((rule) => {
    const m = rule.match(l);
    return m ? [{ title: rule.title, support: m.support, reasoning: m.reasoning, analyte_ids: ids(...m.cited), to_confirm: rule.to_confirm }] : [];
  })
    .sort((a, b) => Number(citesCritical(b.analyte_ids)) - Number(citesCritical(a.analyte_ids)) || SUPPORT_ORDER[a.support] - SUPPORT_ORDER[b.support])
    .slice(0, 4);

  const ruled_out = RULED_OUT.flatMap(({ title, check }) => {
    const cited = check(l)?.filter((r): r is Known => Boolean(r));
    return cited?.length ? [{ title, reason: `${cited.map(v).join(", ")} ${cited.length === 1 ? "is" : "are"} within range.`, analyte_ids: ids(...cited) }] : [];
  }).slice(0, 3);

  const abnormal = results.filter(isAbnormal).length;
  return {
    headline: explanations.length
      ? `${abnormal} of ${results.length} results are outside range; the ${explanations.length === 1 ? "pattern below fits" : `${explanations.length} patterns below fit`} best.`
      : "No known abnormal pattern in these results.",
    explanations,
    ruled_out,
  };
}

export function answerByRules(results: CommentaryResult[], question: string): Answer {
  const q = question.toLowerCase();
  const named = results.filter(
    (r): r is Known => r.analyte_id !== "unknown" && r.value !== null && ANALYTES[r.analyte_id].aliases.some((a) => new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(q)),
  );
  if (!named.length) {
    return {
      answer: "Without the AI assistant, only results can be looked up by name, for example \"what was the potassium?\". Free questions need the AI assistant, which is offline right now.",
      analyte_ids: [],
      answerable: false,
    };
  }
  const range = (r: Known) => (r.ref_low !== null && r.ref_high !== null ? `${r.ref_low}–${r.ref_high}` : r.ref_low !== null ? `above ${r.ref_low}` : `below ${r.ref_high}`);
  return {
    answer: named.map((r) => `${v(r)} (range ${range(r)}): ${r.flag.replace("_", " ")}.`).join(" "),
    analyte_ids: named.map((r) => r.analyte_id),
    answerable: true,
  };
}

const LAY: Partial<Record<AnalyteId, string>> = {
  haemoglobin: "haemoglobin, which carries oxygen in your blood",
  wbc: "white blood cells, which fight infection",
  platelets: "platelets, which help your blood clot",
  sodium: "sodium, a salt in your blood",
  potassium: "potassium, a salt that keeps your heart rhythm steady",
  creatinine: "creatinine, which shows how well your kidneys are working",
  egfr: "eGFR, an estimate of how well your kidneys filter",
  glucose: "blood sugar",
  hba1c: "HbA1c, your average blood sugar over the last 2 to 3 months",
  cholesterol: "cholesterol",
  ldl: "LDL, the 'bad' cholesterol",
  hdl: "HDL, the 'good' cholesterol",
  triglycerides: "triglycerides, a type of fat in the blood",
  alt: "ALT, a liver test",
  tsh: "TSH, a thyroid hormone signal",
  free_t4: "free T4, a thyroid hormone",
  vitamin_d: "vitamin D",
  ferritin: "ferritin, your body's iron stores",
  crp: "CRP, a sign of inflammation or infection",
};

export function letterByRules(results: CommentaryResult[], patientName: string | null): Letter {
  const first = patientName?.includes(",") ? patientName.split(",")[1]?.trim().split(/\s+/)[0] : patientName?.replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, "").split(/\s+/)[0];
  const known = results.filter((r): r is Known => r.analyte_id !== "unknown" && r.value !== null);
  const out = known.filter(isAbnormal);
  const critical = out.filter(isCritical).length;
  const word = (r: Known) => (high(r) ? "higher" : "lower");
  const lines = out.map((r) => `- Your ${LAY[r.analyte_id] ?? r.name} was ${word(r)} than usual (${r.value} ${r.unit}).`);
  const body = [
    `Dear ${first ? first[0]!.toUpperCase() + first.slice(1).toLowerCase() : "patient"},`,
    `Your recent blood test results are back. I have looked at all ${known.length} results.`,
    out.length === known.length
      ? `All ${known.length} were outside the usual range:\n${lines.join("\n")}`
      : out.length
        ? `${known.length - out.length} were normal, but ${out.length} ${out.length === 1 ? "was" : "were"} outside the usual range:\n${lines.join("\n")}`
        : "All of them were within the usual range.",
    critical
      ? `${critical === 1 ? "One of these needs" : "Some of these need"} attention today. We will phone you today; please don't wait for an appointment.` : out.length ? "This doesn't mean something is seriously wrong, but I would like to talk it through with you and may repeat some tests." : "No action is needed.",
    "Please book a routine appointment if you would like to discuss these results.",
    "Best wishes,\n[Doctor's name]",
  ].join("\n\n");
  return { subject: "Your blood test results", body };
}
