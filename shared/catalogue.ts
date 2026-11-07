/**
 * The standard format every report is normalised into: canonical analyte ids, SI units,
 * default adult reference ranges and unit conversions. Code owns the maths; the model never converts.
 */

type Range = readonly [low: number | null, high: number | null];
type Converter = (value: number) => number;

export interface Analyte {
  name: string;
  /** Canonical unit everything is converted to. */
  unit: string;
  /** Default adult reference range in the canonical unit, used when the report gives none. */
  range: Range;
  /** Values beyond these need urgent clinical action. */
  critical?: Range;
  /** Outside this the value is almost certainly an extraction error. */
  plausible: readonly [number, number];
  /** Lower-case names seen on reports. Used by the baseline parser. */
  aliases: readonly string[];
  /** Normalised unit -> converter to the canonical unit. */
  units: Readonly<Record<string, Converter>>;
}

const same: Converter = (v) => v;
const MMOL_PER_L = { "mmol/l": same, "meq/l": same };
const CELLS = { "10^9/l": same, "10^3/ul": same, "k/ul": same };
const CHOLESTEROL_UNITS = { "mmol/l": same, "mg/dl": (v: number) => v / 38.67 };

export const ANALYTES = {
  haemoglobin: {
    name: "Haemoglobin", unit: "g/L", range: [130, 170], critical: [70, null], plausible: [20, 250],
    aliases: ["haemoglobin", "hemoglobin", "hb", "hgb"],
    units: { "g/l": same, "g/dl": (v) => v * 10 },
  },
  wbc: {
    name: "White cell count", unit: "10^9/L", range: [4.0, 11.0], plausible: [0.1, 200],
    aliases: ["white cell count", "white blood cells", "white cells", "wbc", "wcc"],
    units: CELLS,
  },
  platelets: {
    name: "Platelets", unit: "10^9/L", range: [150, 400], critical: [20, null], plausible: [1, 2000],
    aliases: ["platelets", "platelet count", "plt"],
    units: CELLS,
  },
  sodium: {
    name: "Sodium", unit: "mmol/L", range: [133, 146], critical: [120, 160], plausible: [90, 200],
    aliases: ["sodium", "na+", "na"],
    units: MMOL_PER_L,
  },
  potassium: {
    name: "Potassium", unit: "mmol/L", range: [3.5, 5.3], critical: [2.5, 6.0], plausible: [1, 10],
    aliases: ["potassium", "k+"],
    units: MMOL_PER_L,
  },
  creatinine: {
    name: "Creatinine", unit: "µmol/L", range: [59, 104], plausible: [10, 2000],
    aliases: ["creatinine", "crea", "cr"],
    units: { "umol/l": same, "mg/dl": (v) => v * 88.42 },
  },
  egfr: {
    name: "eGFR", unit: "mL/min/1.73m²", range: [90, null], plausible: [1, 200],
    aliases: ["egfr", "estimated gfr"],
    units: { "ml/min/1.73m2": same, "ml/min/1.73m^2": same, "ml/min": same },
  },
  glucose: {
    name: "Glucose", unit: "mmol/L", range: [3.9, 5.5], critical: [2.5, 20], plausible: [0.5, 60],
    aliases: ["glucose, fasting", "fasting glucose", "glucose", "glu"],
    units: { "mmol/l": same, "mg/dl": (v) => v / 18.016 },
  },
  hba1c: {
    name: "HbA1c", unit: "mmol/mol", range: [20, 41], plausible: [10, 200],
    aliases: ["hemoglobin a1c", "haemoglobin a1c", "hba1c", "a1c"],
    units: { "mmol/mol": same, "%": (v) => (v - 2.15) * 10.929 },
  },
  cholesterol: {
    name: "Total cholesterol", unit: "mmol/L", range: [null, 5.0], plausible: [1, 20],
    aliases: ["cholesterol, total", "total cholesterol", "cholesterol"],
    units: CHOLESTEROL_UNITS,
  },
  ldl: {
    name: "LDL cholesterol", unit: "mmol/L", range: [null, 3.0], plausible: [0.1, 15],
    aliases: ["ldl cholesterol calc", "ldl cholesterol", "ldl"],
    units: CHOLESTEROL_UNITS,
  },
  hdl: {
    name: "HDL cholesterol", unit: "mmol/L", range: [1.0, null], plausible: [0.1, 5],
    aliases: ["hdl cholesterol", "hdl"],
    units: CHOLESTEROL_UNITS,
  },
  triglycerides: {
    name: "Triglycerides", unit: "mmol/L", range: [null, 1.7], plausible: [0.1, 50],
    aliases: ["triglycerides", "triglyceride"],
    units: { "mmol/l": same, "mg/dl": (v) => v / 88.57 },
  },
  alt: {
    name: "ALT", unit: "U/L", range: [null, 40], plausible: [1, 5000],
    aliases: ["alanine aminotransferase", "alt"],
    units: { "u/l": same, "iu/l": same },
  },
  tsh: {
    name: "TSH", unit: "mU/L", range: [0.27, 4.2], plausible: [0.001, 200],
    aliases: ["thyroid stimulating hormone", "tsh"],
    units: { "mu/l": same, "miu/l": same, "uiu/ml": same },
  },
  free_t4: {
    name: "Free T4", unit: "pmol/L", range: [12, 22], plausible: [1, 100],
    aliases: ["free thyroxine", "free t4", "ft4"],
    units: { "pmol/l": same, "ng/dl": (v) => v * 12.87 },
  },
  vitamin_d: {
    name: "Vitamin D (25-OH)", unit: "nmol/L", range: [50, null], plausible: [2, 500],
    aliases: ["vitamin d, 25-hydroxy", "25-oh vitamin d", "vitamin d", "vit d"],
    units: { "nmol/l": same, "ng/ml": (v) => v * 2.496 },
  },
  ferritin: {
    name: "Ferritin", unit: "µg/L", range: [30, 400], plausible: [1, 10000],
    aliases: ["ferritin"],
    units: { "ug/l": same, "ng/ml": same },
  },
  crp: {
    name: "CRP", unit: "mg/L", range: [null, 5], plausible: [0.1, 700],
    aliases: ["c-reactive protein", "crp"],
    units: { "mg/l": same, "mg/dl": (v) => v * 10 },
  },
} satisfies Record<string, Analyte>;

export type AnalyteId = keyof typeof ANALYTES;
export const ANALYTE_IDS = Object.keys(ANALYTES) as [AnalyteId, ...AnalyteId[]];

export const getAnalyte = (id: AnalyteId): Analyte => ANALYTES[id];

/** "x10*9/L", "10e9/l", "µmol/L" -> "10^9/l", "10^9/l", "umol/l" */
export function normaliseUnit(unit: string): string {
  return unit
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[µμ]/g, "u")
    .replace(/²/g, "2")
    .replace(/^x(?=10)/, "")
    .replace(/\*|e(?=\d)/g, "^");
}

/** Converter from a reported unit to the analyte's canonical unit. Empty unit = already canonical. */
export function findConverter(id: AnalyteId, unit: string): Converter | undefined {
  const analyte = getAnalyte(id);
  if (unit.trim() === "") return same;
  return analyte.units[normaliseUnit(unit)] ?? (normaliseUnit(unit) === normaliseUnit(analyte.unit) ? same : undefined);
}

/** Round to a clinically sensible precision. */
export function roundValue(value: number): number {
  const abs = Math.abs(value);
  return Number(value.toFixed(abs >= 100 ? 0 : abs >= 10 ? 1 : 2));
}
