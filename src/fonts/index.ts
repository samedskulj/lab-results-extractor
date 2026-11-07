import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";

/** Satoshi (Fontshare): body and UI. Has true tabular figures, so lab values line up in columns. */
export const satoshi = localFont({
  src: [
    { path: "./Satoshi-Variable.woff2", weight: "300 900", style: "normal" },
    { path: "./Satoshi-VariableItalic.woff2", weight: "300 900", style: "italic" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

/** Cabinet Grotesk (Fontshare): headlines only. */
export const cabinet = localFont({
  src: [{ path: "./CabinetGrotesk-Variable.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-cabinet",
  display: "swap",
});

/** JetBrains Mono: quoted lines from the original report. */
export const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const fontVariables = `${satoshi.variable} ${cabinet.variable} ${jetbrains.variable}`;
