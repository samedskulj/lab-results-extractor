import { CircleAlert, LoaderCircle, Sparkles } from "lucide-react";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import type { NormalisedResult } from "../../shared/types.ts";
import { FLAG_DISPLAY, groupOf } from "../format.ts";
import type { ApiError } from "./api.ts";

export function Button({
  variant = "primary",
  size,
  loading = false,
  icon,
  children,
  disabled,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "ai";
  size?: "sm";
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      className={["btn", `btn-${variant}`, size && `btn-${size}`, className].filter(Boolean).join(" ")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle className="spin" size={16} aria-hidden /> : icon}
      {children}
    </button>
  );
}

/** An error that says what happened and offers the way out. */
export function ErrorPanel({ error, action }: { error?: ApiError; action?: ReactNode }) {
  if (!error) return null;
  return (
    <div className="error-panel" role="alert">
      <CircleAlert size={18} aria-hidden />
      <div>
        <p>{error.message}</p>
        {action}
      </div>
    </div>
  );
}

/** Marks prose written by the AI assistant from the checked results. */
export function SourceTag() {
  return (
    <span className="source-tag is-ai" title="Written by the AI assistant from the checked results. Decision support, not a diagnosis.">
      <Sparkles size={12} aria-hidden /> AI draft
    </span>
  );
}

/** Flag as icon + words + colour, never colour alone. */
export function FlagPill({ r }: { r: NormalisedResult }) {
  const flag = FLAG_DISPLAY[r.flag];
  const group = groupOf(r);
  const label = group === "check" && r.flag === "normal" ? "Check" : flag.label;
  return (
    <span className={`flag-pill tone-${group}`}>
      <flag.Icon size={14} aria-hidden />
      {label}
    </span>
  );
}

/** A result as a compact, clickable token: used wherever AI text cites a result. */
export function ResultChip({
  r,
  onClick,
  active,
  ...rest
}: { r: NormalisedResult; onClick?: () => void; active?: boolean } & Omit<ComponentProps<"button">, "onClick">) {
  const flag = FLAG_DISPLAY[r.flag];
  return (
    <button
      type="button"
      className={`result-chip tone-${groupOf(r)}${active ? " is-active" : ""}`}
      onClick={onClick}
      title={`${flag.label}. Show ${r.name} in the results`}
      {...rest}
    >
      <flag.Icon size={14} aria-label={flag.label} />
      <span className="chip-name">{r.name}</span>
      <span className="chip-value">
        {r.value ?? "—"} <span className="chip-unit">{r.unit}</span>
      </span>
    </button>
  );
}
