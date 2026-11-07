// Report templates by country. A template tells the reader what a typical report from that country looks like
// (units, decimals, dates, language) so values are read the way they are printed. Shared by server and browser.

export const REGION_IDS = ["uk", "us", "ca", "au", "de", "fr", "nl", "other"] as const;
export type RegionId = (typeof REGION_IDS)[number];

export interface Region {
  id: RegionId;
  name: string;
  /** One line shown in the form: what reports from here usually look like. */
  summary: string;
  /** Instruction for the reader. Never claims a unit: units are always taken from the page. */
  hint: string;
}

export const REGIONS: Record<RegionId, Region> = {
  uk: {
    id: "uk",
    name: "United Kingdom",
    summary: "SI units (mmol/L, g/L) · dates DD/MM/YYYY · NHS number",
    hint: "UK report: SI units (mmol/L, g/L, umol/L, x10^9/L), dates written day/month/year, patient may be identified by an NHS number.",
  },
  us: {
    id: "us",
    name: "United States",
    summary: "Conventional units (mg/dL, %) · dates MM/DD/YYYY",
    hint: "US report: conventional units (mg/dL, mEq/L, g/dL, %), dates written month/day/year. Results are often flagged H, L or with asterisks.",
  },
  ca: {
    id: "ca",
    name: "Canada",
    summary: "SI units · dates YYYY-MM-DD · English or French",
    hint: "Canadian report: SI units (mmol/L, g/L), dates often YYYY-MM-DD, may be bilingual English/French.",
  },
  au: {
    id: "au",
    name: "Australia & New Zealand",
    summary: "SI units · dates DD/MM/YYYY · eGFR shown as >90",
    hint: "Australian or New Zealand report: SI units, dates day/month/year, eGFR often printed as '>90'.",
  },
  de: {
    id: "de",
    name: "Germany, Austria, Switzerland",
    summary: "German text · decimal comma (5,8) · mixed units",
    hint: "German-language report: decimal comma (5,8 means 5.8), dates DD.MM.YYYY, test names in German (Kalium, Kreatinin, Hämoglobin). Units are mixed: mg/dl for glucose and lipids, SI for many others. Copy values as numbers with a decimal point.",
  },
  fr: {
    id: "fr",
    name: "France & Belgium",
    summary: "French text · decimal comma · g/L and mmol/L",
    hint: "French-language report: decimal comma (5,8 means 5.8), dates DD/MM/YYYY, test names in French (Potassium, Créatinine, Hémoglobine, Glycémie). Copy values as numbers with a decimal point.",
  },
  nl: {
    id: "nl",
    name: "Netherlands",
    summary: "Dutch text · decimal comma · SI units",
    hint: "Dutch-language report: decimal comma (5,8 means 5.8), dates DD-MM-YYYY, test names in Dutch (Kalium, Kreatinine, Hemoglobine). SI units. Copy values as numbers with a decimal point.",
  },
  other: {
    id: "other",
    name: "Another country",
    summary: "Detected from the document itself",
    hint: "Country unknown: work out the language, decimal separator, date order and unit system from the document itself.",
  },
};

export const REGION_LIST: Region[] = REGION_IDS.map((id) => REGIONS[id]);
