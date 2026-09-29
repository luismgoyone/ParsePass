"use client";

import { Check, Copy } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";

import type { AtsIssue, AtsLine } from "@/lib/ats/types";
import { cn } from "@/lib/utils";

import { SEVERITY_STYLES } from "./severity";

/**
 * The raw text an ATS extracts, one numbered line per parser line, with flagged lines tinted
 * by the most severe issue that touches them.
 */
export function AtsConsole({
  lines,
  issues = [],
  selectedRule,
  className,
  emptyMessage = "No text could be extracted.",
}: {
  lines: AtsLine[];
  issues?: AtsIssue[];
  selectedRule?: string | null;
  className?: string;
  emptyMessage?: string;
}) {
  const container = useRef<HTMLOListElement>(null);

  // Issues are sorted most severe first, so the first issue to claim a line wins.
  const lineIssue = new Map<number, AtsIssue>();
  const firstLineOf = new Map<number, AtsIssue[]>();
  for (const issue of issues) {
    for (const i of issue.lines) if (!lineIssue.has(i)) lineIssue.set(i, issue);
    if (issue.lines.length > 0) {
      const first = Math.min(...issue.lines);
      firstLineOf.set(first, [...(firstLineOf.get(first) ?? []), issue]);
    }
  }

  useEffect(() => {
    if (!selectedRule) return;
    container.current
      ?.querySelector(`[data-rules~="${selectedRule}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selectedRule]);

  if (lines.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-console p-8 font-mono text-[13px] text-subtle-foreground",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  const width = String(lines.length).length < 3 ? 3 : String(lines.length).length;

  return (
    <ol
      ref={container}
      aria-label="ATS view"
      className={cn(
        "overflow-auto bg-console py-3 font-mono text-[13px] leading-normal",
        className,
      )}
    >
      {lines.map((line, i) => {
        const issue = lineIssue.get(i);
        const rules = issues.filter((x) => x.lines.includes(i)).map((x) => x.rule);
        const selected = !!selectedRule && rules.includes(selectedRule);
        const newPage = i > 0 && line.page !== lines[i - 1].page;
        return (
          <Fragment key={i}>
            {newPage && (
              <li
                aria-hidden
                className="my-2 border-t border-dashed border-border px-4 pt-2 text-subtle-foreground"
              >
                {`// page ${line.page}`}
              </li>
            )}
            {firstLineOf.get(i)?.map((x) => (
              <li
                key={x.rule}
                className={cn(
                  "mt-1 border-l-2 px-4 py-0.5 text-xs",
                  SEVERITY_STYLES[x.severity].lineActive,
                  SEVERITY_STYLES[x.severity].text,
                )}
              >
                [{x.severity.toUpperCase()} {x.rule}: {x.title}]
              </li>
            ))}
            <li
              data-rules={rules.join(" ")}
              className={cn(
                "flex gap-3 border-l-2 border-transparent px-4 transition-colors",
                issue &&
                  (selected
                    ? SEVERITY_STYLES[issue.severity].lineActive
                    : SEVERITY_STYLES[issue.severity].line),
                issue && SEVERITY_STYLES[issue.severity].text,
              )}
            >
              <span aria-hidden className="shrink-0 text-subtle-foreground select-none">
                {String(i + 1).padStart(width, "0")}
              </span>
              <span
                className={cn("break-words whitespace-pre-wrap", !issue && "text-muted-foreground")}
              >
                {line.text}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}

export function CopyButton({ text, label = "Copy text" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1 font-mono text-xs text-muted-foreground hover:bg-card hover:text-foreground"
      title={label}
    >
      {copied ? (
        <Check aria-hidden className="size-3.5 text-success" />
      ) : (
        <Copy aria-hidden className="size-3.5" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
