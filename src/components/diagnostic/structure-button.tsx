"use client";

import { AlertTriangle, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { useSession } from "@/components/session/session-provider";

/** Hands the extracted text to Claude, then opens the review screen. */
export function StructureButton() {
  const router = useRouter();
  const { structure, structuring, error, resume, doc } = useSession();
  const empty = !doc || doc.sourceText.replace(/\s/g, "").length < 50;

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[13px] text-red-300">
          <AlertTriangle aria-hidden className="size-4 text-destructive" />
          {error}
        </p>
      )}
      {resume && (
        <button
          type="button"
          onClick={() => router.push("/review")}
          className="rounded-md border border-border bg-card px-4 py-2 font-mono text-[13px] hover:border-border-strong hover:bg-raised"
        >
          Back to my edits
        </button>
      )}
      <button
        type="button"
        disabled={structuring || empty}
        title={empty ? "There's no text to structure. Paste the text instead." : undefined}
        onClick={async () => {
          if (await structure()) router.push("/review");
        }}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-mono text-[13px] text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {structuring ? (
          <>
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Claude is structuring your resume…
          </>
        ) : (
          <>
            <Sparkles aria-hidden className="size-4" />
            {resume ? "Re-run Claude extraction" : "Continue: structure with Claude"}
            <ArrowRight aria-hidden className="size-4" />
          </>
        )}
      </button>
    </div>
  );
}
