import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/fonts";

export const metadata: Metadata = {
  title: { default: "Readout · Lab results you can trace", template: "Readout · %s" },
  description: "Readout turns any lab report, letter or scan into one checked, prioritised view for GPs. Every value links back to the line it came from.",
};

export const viewport: Viewport = { themeColor: "#F2F5FA" };

// Each section brings its own stylesheet: the landing page uses Tailwind + shadcn/ui in full,
// the dashboard keeps its hand-written CSS with Tailwind utilities available on top.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
