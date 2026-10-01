"use client";

import { AlertTriangle, Check, Loader2, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { useSession } from "@/components/session/session-provider";
import type { Experience } from "@/lib/resume/schema";
import { diffWords } from "@/lib/suggest/diff";
import { cn } from "@/lib/utils";

interface Suggestion {
  index: number;
  original: string;
  text: string;
  reason: string;
}

/**
 * "Suggest stronger wording" for one role. Each suggestion is a diff the user accepts or
 * dismisses; nothing changes on its own. The server has already thrown out any suggestion that
 * adds a number or a named thing that isn't on the resume.
 */
export function BulletSuggestions({
  job,
  onAccept,
}: {
  job: Experience;
  onAccept: (bulletIndex: number, text: string) => void;
}) {
  const { doc, job: target, ai } = useSession();
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [discarded, setDiscarded] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bullets = job.bullets.filter((b) => b.trim());
  // A suggestion only applies while its bullet still reads the way it did when suggested.
  const live = (suggestions ?? []).filter((s) => job.bullets[s.index] === s.original);

  async function suggest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: job.title,
          company: job.company,
          current: /present|current|now/i.test(job.end),
          bullets: job.bullets,
          jobDescription: target?.description,
          resumeSource: doc?.sourceText ?? "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        suggestions?: Suggestion[];
        discarded?: number;
        error?: string;
      };
      if (!res.ok || !data.suggestions) {
        setError(data.error ?? "Couldn't get suggestions. Try again.");
        return;
      }
      setSuggestions(data.suggestions);
      setDiscarded(data.discarded ?? 0);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (bullets.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void suggest()}
          disabled={loading}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-60 sm:min-h-0"
        >
          {loading ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          ) : (
            <Sparkles aria-hidden className="size-3.5 text-primary-text" />
          )}
          {loading ? `${ai.label} is reading your bullets…` : "Suggest stronger wording"}
        </button>
        {target && !loading && (
          <span className="font-mono text-[11px] text-subtle-foreground">
            Uses your target job&apos;s wording where it fits.
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-[13px] text-red-300">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
          {error}
        </p>
      )}

      {suggestions && live.length === 0 && !loading && (
        <p className="font-mono text-xs text-muted-foreground">
          {suggestions.length === 0
            ? "These bullets already read well. No suggestions."
            : "All suggestions handled."}
        </p>
      )}

      {live.length > 0 && (
        <ul aria-label="Suggestions" className="flex flex-col gap-2">
          {live.map((s) => (
            <li
              key={`${s.index}-${s.text}`}
              className="rounded-md border border-primary/40 bg-primary/5 p-3"
            >
              <p className="mb-1.5 font-mono text-[11px] text-primary-text">
                Bullet {s.index + 1} · {s.reason}
              </p>
              <p className="text-[13px] leading-relaxed">
                {diffWords(s.original, s.text).map((part, k) => (
                  <span
                    key={k}
                    className={cn(
                      part.type === "removed" && "text-red-300 line-through decoration-red-400/70",
                      part.type === "added" && "bg-emerald-500/15 text-emerald-300",
                    )}
                  >
                    {part.text}
                  </span>
                ))}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onAccept(s.index, s.text)}
                  className="inline-flex min-h-10 items-center gap-1 rounded-md bg-primary px-3 py-1 font-mono text-xs text-primary-foreground hover:bg-primary-hover sm:min-h-0"
                >
                  <Check aria-hidden className="size-3.5" /> Accept
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestions((all) => (all ?? []).filter((x) => x !== s))}
                  className="inline-flex min-h-10 items-center gap-1 rounded-md border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground hover:text-foreground sm:min-h-0"
                >
                  <X aria-hidden className="size-3.5" /> Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {suggestions && discarded > 0 && (
        <p className="font-mono text-[11px] text-subtle-foreground">
          {discarded} suggestion{discarded === 1 ? " was" : "s were"} thrown out for adding facts
          that aren&apos;t on your resume.
        </p>
      )}
    </div>
  );
}
