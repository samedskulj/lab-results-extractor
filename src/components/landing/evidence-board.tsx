"use client";

import { ChevronDown, ChevronsDown, ChevronsUp, ChevronUp, ShieldCheck } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { rangeGeometry } from "@/format";
import { cn } from "@/lib/utils";
import { TONE, type Tone } from "./tone";

/** An excerpt of the fictional LIS export that ships as a sample document. */
const DOC = [
  "# MRN|PatientName|DOB|Collected",
  "# 77120456|PRICE, Helen|1952-11-30|2026-10-28 05:52",
  "code|test|value|unit|low|high|flag",
  "HB|Hb|68|g/L|115|165|LL",
  "WBC|WBC|13.4|10*9/L|4.0|11.0|H",
  "NA|Na+|124|mmol/L|133|146|L",
  "K|K+|6.4|mmol/L|3.5|5.3|HH",
  "CREA|Cr|212|umol/L|45|84|H",
  "CRP|CRP|187|mg/L|0|5|H",
];

interface Traced {
  name: string;
  value: number;
  unit: string;
  low: number;
  high: number;
  flag: string;
  tone: Tone;
  Icon: typeof ChevronsUp;
  line: number;
}

const TRACED: Traced[] = [
  { name: "Potassium", value: 6.4, unit: "mmol/L", low: 3.5, high: 5.3, flag: "Critical high", tone: "critical", Icon: ChevronsUp, line: 6 },
  { name: "Haemoglobin", value: 68, unit: "g/L", low: 115, high: 165, flag: "Critical low", tone: "critical", Icon: ChevronsDown, line: 3 },
  { name: "Creatinine", value: 212, unit: "µmol/L", low: 45, high: 84, flag: "High", tone: "outside", Icon: ChevronUp, line: 7 },
  { name: "Sodium", value: 124, unit: "mmol/L", low: 133, high: 146, flag: "Low", tone: "outside", Icon: ChevronDown, line: 5 },
];

/** The signature: one result, magnified, threaded back to the exact line it was read from. */
export function EvidenceBoard() {
  const [pick, setPick] = useState(0);
  const t = TRACED[pick]!;
  const tone = TONE[t.tone];
  const board = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const [path, setPath] = useState<{ d: string; end: [number, number] } | null>(null);
  const geo = rangeGeometry(t.value, t.low, t.high)!;

  useLayoutEffect(() => {
    const el = board.current;
    if (!el) return;
    const draw = () => {
      const b = el.getBoundingClientRect();
      const c = card.current?.getBoundingClientRect();
      const l = line.current?.getBoundingClientRect();
      if (!c || !l) return;
      if (l.left >= c.right - 4) {
        // Side by side: the thread runs from the card's right edge to the quoted line.
        const x1 = c.right - b.left;
        const y1 = c.top - b.top + 70;
        const x2 = l.left - b.left - 6;
        const y2 = l.top - b.top + l.height / 2;
        const dx = Math.max(30, (x2 - x1) * 0.6);
        setPath({ d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`, end: [x2, y2] });
      } else {
        // Stacked: the thread drops from the card to the line below.
        const x1 = c.left - b.left + 48;
        const y1 = c.bottom - b.top;
        const x2 = l.left - b.left + 24;
        const y2 = l.top - b.top - 2;
        const dy = Math.max(24, (y2 - y1) * 0.6);
        setPath({ d: `M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`, end: [x2, y2] });
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pick]);

  return (
    <figure className="m-0 min-w-0" aria-label="Example: a result traced to its source line">
      <div
        ref={board}
        className="relative grid items-center gap-11 rounded-3xl border bg-white/60 p-4 shadow-soft backdrop-blur-sm sm:p-7 md:grid-cols-[minmax(200px,0.85fr)_minmax(0,1.15fr)] md:gap-16"
      >
        <div ref={card} aria-live="polite" className={cn("relative z-[1] flex flex-col items-start gap-2.5 rounded-2xl border bg-card p-5 pb-4 shadow-pop", tone.border)}>
          <p className="font-semibold text-ink-2">{t.name}</p>
          <p className={cn("font-heading text-[3.25rem] leading-none font-bold tracking-tight transition-colors", tone.text)}>
            {t.value} <span className="font-sans text-base font-medium tracking-normal text-ink-3">{t.unit}</span>
          </p>
          <span className={cn("inline-flex items-center gap-1 rounded-full py-0.5 pr-2.5 pl-2 text-xs font-semibold", tone.tint, tone.text)}>
            <t.Icon className="size-3.5" aria-hidden /> {t.flag}
          </span>
          <span className="relative mt-1.5 block h-1.5 w-full rounded-full bg-muted" aria-hidden>
            <span className="absolute inset-y-0 rounded-full bg-normal/20" style={{ left: `${geo.band[0]}%`, width: `${geo.band[1] - geo.band[0]}%` }} />
            <span
              className={cn("absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow transition-[left] duration-500", tone.dot)}
              style={{ left: `${geo.at}%` }}
            />
          </span>
          <p className="text-[0.8125rem] text-ink-2">
            Reference {t.low}–{t.high} {t.unit}
          </p>
          <p className="mt-1 flex w-full items-center gap-1.5 border-t pt-3 text-[0.8125rem] font-medium text-mint-ink">
            <ShieldCheck className="size-3.5" aria-hidden /> Quote found in the original
          </p>
        </div>

        <div className="relative z-[1] min-w-0 overflow-hidden rounded-xl border bg-card shadow-soft">
          <p className="border-b px-4 py-2.5 text-xs font-semibold text-ink-3">Original · St Brannock&apos;s LIS export</p>
          <pre className="m-0 overflow-hidden px-4 pt-3 pb-3.5 font-mono text-[0.6875rem] leading-8 whitespace-pre text-ink-3 sm:text-xs">
            {DOC.map((text, i) => (
              <span
                key={i}
                ref={i === t.line ? line : undefined}
                className={cn(
                  "-mx-1.5 block rounded-md px-1.5 transition-colors duration-200",
                  i === t.line && "bg-primary/10 text-foreground ring-[1.5px] ring-primary ring-inset",
                )}
              >
                {text}
              </span>
            ))}
          </pre>
        </div>

        <svg className="pointer-events-none absolute inset-0 z-0 size-full overflow-visible md:z-[2]" aria-hidden>
          {path && (
            <>
              <path
                key={`p${pick}`}
                d={path.d}
                pathLength={1}
                className={cn(
                  "animate-thread fill-none [stroke-dasharray:1] [stroke-dashoffset:1] [stroke-linecap:round] [stroke-width:2.25]",
                  t.tone === "critical" ? "stroke-critical" : "stroke-mint",
                )}
              />
              <circle
                key={`c${pick}`}
                cx={path.end[0]}
                cy={path.end[1]}
                r={4.5}
                className="hidden animate-thread-end fill-white stroke-primary opacity-0 [stroke-width:2.25] md:block"
              />
            </>
          )}
        </svg>
      </div>

      <figcaption className="mt-4 flex flex-wrap items-center gap-2.5 px-1">
        <span className="text-[0.8125rem] text-muted-foreground">Trace another value:</span>
        <span className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a value to trace">
          {TRACED.map((v, i) => (
            <button
              key={v.name}
              type="button"
              aria-pressed={i === pick}
              onClick={() => setPick(i)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-card py-1 pr-2.5 pl-2 text-[0.8125rem] transition-all hover:border-input hover:shadow-xs",
                i === pick && "border-mint ring-3 ring-mint-tint",
              )}
            >
              <v.Icon className={cn("size-3.5", TONE[v.tone].text)} aria-hidden />
              <span className="font-medium">{v.name}</span>
              <span className={cn("font-bold", TONE[v.tone].text)}>{v.value}</span>
            </button>
          ))}
        </span>
        <span className="basis-full text-[0.8125rem] text-muted-foreground">Fictional patient from the sample documents.</span>
      </figcaption>
    </figure>
  );
}
