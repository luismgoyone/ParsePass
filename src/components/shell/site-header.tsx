"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { STEPS, stepForPath } from "./steps";

export function SiteHeader() {
  const pathname = usePathname();
  const current = STEPS.findIndex((s) => s.id === stepForPath(pathname));

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
            const done = i < current;
            const active = i === current;
            return (
              <div key={step.id} className="flex items-center">
                {i > 0 && <span className="mx-2 text-subtle-foreground">/</span>}
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
                  {done ? (
                    <Check aria-hidden className="size-3.5" />
                  ) : (
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-4 items-center justify-center rounded-full border text-[10px]",
                        active ? "border-primary bg-primary text-white" : "border-border-strong",
                      )}
                    >
                      {i + 1}
                    </span>
                  )}
                  {step.label}
                </Link>
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
    </header>
  );
}
