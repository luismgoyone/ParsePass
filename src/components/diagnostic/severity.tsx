import type { Severity } from "@/lib/ats/types";
import { cn } from "@/lib/utils";

export const SEVERITY_STYLES: Record<
  Severity,
  { badge: string; line: string; lineActive: string; text: string; bar: string }
> = {
  critical: {
    badge: "border-red-600 bg-red-950/30 text-red-400",
    line: "border-l-destructive/70 bg-destructive/5",
    lineActive: "border-l-destructive bg-destructive/15",
    text: "text-red-300",
    bar: "bg-destructive",
  },
  warning: {
    badge: "border-amber-600 bg-amber-950/30 text-amber-400",
    line: "border-l-warning/70 bg-warning/5",
    lineActive: "border-l-warning bg-warning/15",
    text: "text-amber-200",
    bar: "bg-warning",
  },
  notice: {
    badge: "border-zinc-600 bg-zinc-800/40 text-zinc-300",
    line: "border-l-zinc-500/70 bg-zinc-500/5",
    lineActive: "border-l-zinc-400 bg-zinc-500/15",
    text: "text-zinc-200",
    bar: "bg-zinc-500",
  },
};

/** Severity is always a label and a color, never color alone. */
export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center rounded-sm border px-2 font-mono text-xs uppercase",
        SEVERITY_STYLES[severity].badge,
        className,
      )}
    >
      {severity}
    </span>
  );
}
