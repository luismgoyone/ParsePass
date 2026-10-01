"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "@/components/session/session-provider";
import { cn } from "@/lib/utils";

import { STEPS, stepForPath, type StepId } from "./steps";

export function SiteHeader() {
  const pathname = usePathname();
  const session = useSession();
  const current = STEPS.findIndex((s) => s.id === stepForPath(pathname));
  const reachable: Record<StepId, boolean> = {
    upload: true,
    diagnostic: !!session.doc,
    review: !!session.resume,
    export: !!session.resume,
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-panel/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-[2px] bg-primary" />
            <span className="text-lg font-semibold tracking-tight">ParsePass</span>
          </Link>
          <span className="hidden items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5 font-mono text-xs text-success lg:inline-flex">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-success" />
            In-memory only · nothing stored
          </span>
        </div>

        <nav aria-label="Steps" className="hidden items-center md:flex">
          {STEPS.map((step, i) => {
            const done = i < current && reachable[step.id];
            const active = i === current;
            return (
              <div key={step.id} className="flex items-center">
                {i > 0 && <span className="mx-2 text-subtle-foreground">/</span>}
                {reachable[step.id] || active ? (
                  <Link
                    href={step.href}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex h-14 items-center gap-1.5 border-b-2 border-transparent font-mono text-[13px] transition-colors",
                      active && "border-primary text-primary-text",
                      done && "text-success",
                      !active && !done && "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <StepMarker index={i} active={active} done={done} />
                    {step.label}
                  </Link>
                ) : (
                  <span
                    aria-disabled
                    className="flex h-14 cursor-not-allowed items-center gap-1.5 font-mono text-[13px] text-subtle-foreground"
                  >
                    <StepMarker index={i} active={false} done={false} />
                    {step.label}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        <a
          href="https://github.com/luismgoyone/ParsePass"
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
        >
          GitHub
        </a>
      </div>

      {/* Phones: the same steps, four across, under the logo bar. */}
      <nav aria-label="Steps" className="grid grid-cols-4 border-t border-border md:hidden">
        {STEPS.map((step, i) => {
          const done = i < current && reachable[step.id];
          const active = i === current;
          const className = cn(
            "flex min-h-11 items-center justify-center gap-1.5 border-b-2 border-transparent font-mono text-xs",
            active && "border-primary text-primary-text",
            done && "text-success",
            !active && !done && "text-muted-foreground",
          );
          return reachable[step.id] || active ? (
            <Link
              key={step.id}
              href={step.href}
              aria-current={active ? "step" : undefined}
              className={className}
            >
              <StepMarker index={i} active={active} done={done} />
              {step.short}
            </Link>
          ) : (
            <span key={step.id} aria-disabled className={cn(className, "text-subtle-foreground")}>
              <StepMarker index={i} active={false} done={false} />
              {step.short}
            </span>
          );
        })}
      </nav>
    </header>
  );
}

function StepMarker({ index, active, done }: { index: number; active: boolean; done: boolean }) {
  if (done) return <Check aria-hidden className="size-3.5" />;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 items-center justify-center rounded-full border text-[10px]",
        active ? "border-primary bg-primary text-white" : "border-border-strong",
      )}
    >
      {index + 1}
    </span>
  );
}
