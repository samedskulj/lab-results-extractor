/** Clinical state colours. Each always appears with an icon and a word, never colour alone. */
export type Tone = "critical" | "outside" | "normal";

export const TONE = {
  critical: { text: "text-critical-ink", tint: "bg-critical-tint", dot: "bg-critical", border: "border-critical-line" },
  outside: { text: "text-outside-ink", tint: "bg-outside-tint", dot: "bg-outside", border: "border-outside-line" },
  normal: { text: "text-mint-ink", tint: "bg-normal-tint", dot: "bg-normal", border: "border-border" },
} satisfies Record<Tone, Record<string, string>>;
