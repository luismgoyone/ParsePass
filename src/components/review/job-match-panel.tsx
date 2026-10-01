"use client";

import { AlertTriangle, CheckCircle2, Loader2, Target } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { useSession } from "@/components/session/session-provider";
import { matchKeywords } from "@/lib/jobs/match";
import type { Keyword } from "@/lib/jobs/schema";
import type { Resume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";

/**
 * Paste a job description, see which of its keywords the resume covers. The model only lists
 * the keywords; matching runs here, so it's repeatable and updates as the resume is edited.
 * Nothing is ever added to the resume from this panel.
 */
export function JobMatchPanel({ resume }: { resume: Resume }) {
  const { job, findKeywords, findingKeywords, keywordError, clearJob, ai } = useSession();
  const [draft, setDraft] = useState("");
  const id = useId();
  const match = useMemo(() => (job ? matchKeywords(job.keywords, resume) : null), [job, resume]);

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="rounded-lg border border-border bg-panel p-4"
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <h2 id={`${id}-title`} className="flex items-center gap-2 text-lg font-medium">
          <Target aria-hidden className="size-4 text-primary-text" />
          Job match
        </h2>
        {job && (
          <button
            type="button"
            onClick={() => {
              setDraft(job.description);
              clearJob();
            }}
            className="py-1 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            Change job
          </button>
        )}
      </header>

      {!job || !match ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void findKeywords(draft);
          }}
        >
          <label
            htmlFor={`${id}-jd`}
            className="font-mono text-xs leading-relaxed text-muted-foreground"
          >
            Paste a job description to see which of its keywords your resume already covers.
          </label>
          <textarea
            id={`${id}-jd`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            placeholder="Paste the job description…"
            className="w-full rounded-md border border-border bg-console p-2.5 text-[13px] placeholder:text-subtle-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
          {keywordError && (
            <p role="alert" className="flex items-start gap-1.5 text-[13px] text-red-300">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
              {keywordError}
            </p>
          )}
          <button
            type="submit"
            disabled={findingKeywords || draft.trim().length < 80}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 font-mono text-[13px] hover:border-border-strong hover:bg-raised disabled:opacity-50"
          >
            {findingKeywords ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" /> {ai.label} is reading the
                job…
              </>
            ) : (
              "Check keywords"
            )}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          {job.role && (
            <p className="font-mono text-xs text-muted-foreground">Target: {job.role}</p>
          )}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between font-mono text-xs">
              <span className="text-muted-foreground">Keyword coverage</span>
              <span
                data-testid="keyword-score"
                className={match.score >= 70 ? "text-success" : "text-warning"}
              >
                {match.score}%
              </span>
            </div>
            <div
              role="meter"
              aria-label="Keyword coverage"
              aria-valuenow={match.score}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 overflow-hidden rounded-full bg-raised"
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  match.score >= 70 ? "bg-success" : "bg-warning",
                )}
                style={{ width: `${match.score}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-xs text-subtle-foreground">
              Required {match.required.found}/{match.required.total}
              {match.preferred.total > 0 &&
                ` · Preferred ${match.preferred.found}/${match.preferred.total}`}
            </p>
          </div>

          {match.missing.length > 0 && (
            <KeywordList title="Not on your resume" keywords={match.missing} tone="missing" />
          )}
          {match.found.length > 0 && (
            <KeywordList title="Already covered" keywords={match.found} tone="found" />
          )}

          <p className="border-t border-border pt-3 font-mono text-xs leading-relaxed text-subtle-foreground">
            ParsePass never adds keywords for you. Add one only if it&apos;s true, in the section
            where it belongs. The score updates as you edit.
          </p>
        </div>
      )}
    </section>
  );
}

function KeywordList({
  title,
  keywords,
  tone,
}: {
  title: string;
  keywords: Keyword[];
  tone: "found" | "missing";
}) {
  return (
    <div>
      <p
        className={cn(
          "mb-1.5 font-mono text-xs",
          tone === "missing" ? "text-amber-300" : "text-success",
        )}
      >
        {title} ({keywords.length})
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {keywords.map((k) => (
          <li
            key={k.term}
            title={k.importance === "required" ? "Required" : "Preferred"}
            className={cn(
              "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-xs",
              tone === "missing"
                ? "border-amber-700 bg-amber-950/30 text-amber-200"
                : "border-border bg-console text-muted-foreground",
            )}
          >
            {tone === "found" ? (
              <CheckCircle2 aria-label="covered" className="size-3 text-success" />
            ) : (
              <AlertTriangle aria-label="missing" className="size-3" />
            )}
            {k.term}
            {k.importance === "preferred" && (
              <span className="text-subtle-foreground">(pref.)</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
