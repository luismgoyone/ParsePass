"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useSession } from "@/components/session/session-provider";
import { atsText } from "@/lib/ats/lines";
import type { AtsIssue, Severity } from "@/lib/ats/types";
import { cn } from "@/lib/utils";

import { AtsConsole, CopyButton } from "./ats-console";
import { SeverityBadge, SEVERITY_STYLES } from "./severity";
import { SourcePreview } from "./source-preview";

const ENGINE = { pdf: "pdf.js (unpdf)", docx: "mammoth", text: "plain text" } as const;

export function DiagnosticView({ next }: { next?: React.ReactNode }) {
  const { ready, doc, diagnosis, source, ai } = useSession();
  const [selectedRule, setSelectedRule] = useState<string | null>(null);

  if (!ready) return <Loading />;
  if (!doc || !diagnosis) return <NeedsUpload />;

  const { issues, score } = diagnosis;
  const counts = countBySeverity(issues);
  const chars = doc.lines.reduce((n, l) => n + l.text.length, 0);

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2 md:px-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs">
            <FileText aria-hidden className="size-3.5 text-muted-foreground" />
            {doc.fileName}
            {source && source.kind !== "text" && (
              <span className="text-subtle-foreground">({formatBytes(source.size)})</span>
            )}
          </span>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw aria-hidden className="size-3.5" />
            Replace file
          </Link>
        </div>
        <dl className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
          <Meta label="Engine" value={ENGINE[doc.kind]} dot />
          <Meta label="Lines" value={String(doc.lines.length)} />
          <Meta label="Characters" value={chars.toLocaleString()} />
        </dl>
      </div>

      <ScoreBanner score={score} issues={issues} />

      {issues.length > 0 && (
        <section aria-labelledby="anomaly-log" className="border-b border-border px-4 py-3 md:px-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            <h2 id="anomaly-log" className="text-muted-foreground">
              ISSUES ({issues.length})
            </h2>
            <p className="flex gap-3 text-subtle-foreground">
              {(["critical", "warning", "notice"] as Severity[])
                .filter((s) => counts[s] > 0)
                .map((s) => (
                  <span key={s} className={SEVERITY_STYLES[s].badge.split(" ").at(-1)}>
                    {s[0].toUpperCase() + s.slice(1)} ({counts[s]})
                  </span>
                ))}
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {issues.map((issue) => (
              <IssueCard
                key={issue.rule}
                issue={issue}
                selected={selectedRule === issue.rule}
                onSelect={() => setSelectedRule(selectedRule === issue.rule ? null : issue.rule)}
              />
            ))}
          </ul>
        </section>
      )}

      <div className="grid flex-1 gap-4 p-4 md:px-6 lg:grid-cols-2">
        <Pane
          title="Source document"
          icon={FileText}
          badge={
            issues.length > 0 ? (
              <span className="rounded-sm border border-destructive/50 bg-destructive/10 px-1.5 font-mono text-xs text-red-400">
                {issues.length} issue{issues.length === 1 ? "" : "s"}
              </span>
            ) : null
          }
        >
          <div className="max-h-[70vh] overflow-auto bg-zinc-800/40">
            <SourcePreview source={source} doc={doc} issues={issues} selectedRule={selectedRule} />
          </div>
        </Pane>
        <Pane
          title="ATS view: what a parser extracts"
          icon={Terminal}
          badge={<CopyButton text={atsText(doc.lines)} />}
        >
          <p className="border-b border-border bg-card/50 px-4 py-2 font-mono text-xs text-subtle-foreground">
            {doc.kind === "pdf"
              ? "Reading order: line by line, left to right, the way a naive parser reads a page."
              : doc.kind === "docx"
                ? "Document body only. Page headers and footers are not read."
                : "Pasted text, as entered."}
          </p>
          <AtsConsole
            lines={doc.lines}
            issues={issues}
            selectedRule={selectedRule}
            className="max-h-[70vh]"
            emptyMessage="No selectable text. An ATS sees an empty resume."
          />
        </Pane>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-panel/95 px-4 py-3 backdrop-blur md:px-6">
        <p className="text-muted-foreground">
          <span className="font-mono text-xs text-primary-text">Next:</span> {ai.label} restructures
          your resume into standard sections. You review every field before exporting.
        </p>
        {next}
      </div>
    </main>
  );
}

function IssueCard({
  issue,
  selected,
  onSelect,
}: {
  issue: AtsIssue;
  selected: boolean;
  onSelect: () => void;
}) {
  const style = SEVERITY_STYLES[issue.severity];
  return (
    <li
      className={cn(
        "relative flex flex-col gap-1.5 overflow-hidden rounded-md border border-border bg-panel p-3 pl-4",
        selected && "border-border-strong bg-card",
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", style.bar)} />
      <div className="flex items-center justify-between">
        <SeverityBadge severity={issue.severity} />
        <span className="font-mono text-xs text-subtle-foreground">Rule: {issue.rule}</span>
      </div>
      <h3 className="font-mono text-[13px] font-medium">{issue.title}</h3>
      <p className="flex-1 text-[13px] leading-snug text-muted-foreground">{issue.detail}</p>
      <div className="mt-1 flex items-center justify-between border-t border-border pt-2 font-mono text-xs">
        <span className={style.text}>{issue.impact}</span>
        {issue.lines.length > 0 && (
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className="text-primary-text hover:underline"
          >
            {selected ? "Hide" : "Show in ATS view"}
          </button>
        )}
      </div>
    </li>
  );
}

function ScoreBanner({ score, issues }: { score: number; issues: AtsIssue[] }) {
  const critical = issues.filter((i) => i.severity === "critical").length;
  if (issues.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-b border-success/30 bg-success/10 px-4 py-3 md:px-6">
        <CheckCircle2 aria-hidden className="size-5 text-success" />
        <p className="font-medium text-success">No parsing issues found.</p>
        <ScoreChip score={score} tone="success" />
        <p className="text-muted-foreground">
          Continue to structure it into the ATS template anyway.
        </p>
      </div>
    );
  }
  const tone = critical > 0 ? "critical" : "warning";
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-b px-4 py-3 md:px-6",
        tone === "critical"
          ? "border-destructive/30 bg-destructive/10"
          : "border-warning/30 bg-warning/10",
      )}
    >
      <AlertTriangle
        aria-hidden
        className={cn("size-5", tone === "critical" ? "text-destructive" : "text-warning")}
      />
      <p className={cn("font-medium", tone === "critical" ? "text-red-300" : "text-amber-200")}>
        {issues.length} ATS parsing issue{issues.length === 1 ? "" : "s"} found
        {critical > 0 && ` (${critical} critical)`}.
      </p>
      <ScoreChip score={score} tone={tone} />
      <p className="text-muted-foreground">An ATS would misread parts of this resume.</p>
    </div>
  );
}

function ScoreChip({ score, tone }: { score: number; tone: "success" | "warning" | "critical" }) {
  return (
    <span
      data-testid="ats-score"
      className={cn(
        "rounded-sm border px-2 py-0.5 font-mono text-xs",
        tone === "success" && "border-success/60 text-success",
        tone === "warning" && "border-warning/60 text-warning",
        tone === "critical" && "border-destructive/60 text-red-400",
      )}
    >
      Score: {score}/100
    </span>
  );
}

function Pane({
  title,
  icon: Icon,
  badge,
  children,
}: {
  title: string;
  icon: typeof FileText;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-panel">
      <header className="flex h-11 items-center justify-between gap-2 border-b border-border bg-card px-4">
        <h2 className="flex items-center gap-2 font-mono text-[13px]">
          <Icon aria-hidden className="size-4 text-muted-foreground" />
          {title}
        </h2>
        {badge}
      </header>
      {children}
    </section>
  );
}

function Meta({ label, value, dot }: { label: string; value: string; dot?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-success" />}
      <dt>{label}:</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function countBySeverity(issues: AtsIssue[]): Record<Severity, number> {
  const out: Record<Severity, number> = { critical: 0, warning: 0, notice: 0 };
  for (const i of issues) out[i.severity]++;
  return out;
}

function formatBytes(n: number): string {
  return n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function Loading() {
  return (
    <main className="flex flex-1 items-center justify-center gap-2 p-16 font-mono text-xs text-muted-foreground">
      <Loader2 aria-hidden className="size-4 animate-spin" /> Loading…
    </main>
  );
}

export function NeedsUpload({
  message = "Upload a resume first to see what an ATS reads.",
}: {
  message?: string;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <p className="text-muted-foreground">{message}</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-mono text-[13px] text-primary-foreground hover:bg-primary-hover"
      >
        Upload a resume <ArrowRight aria-hidden className="size-4" />
      </Link>
    </main>
  );
}
