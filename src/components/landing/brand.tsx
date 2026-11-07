import { Mark } from "@/ui/Mark";
import { cn } from "@/lib/utils";

export function Brand({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <a href="/" className={cn("inline-flex items-center gap-2.5 text-foreground", className)}>
      <Mark size={size} />
      <span className="font-heading text-lg font-bold tracking-tight">Readout</span>
    </a>
  );
}
