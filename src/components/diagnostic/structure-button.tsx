"use client";

import { AlertTriangle, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { useSession } from "@/components/session/session-provider";

/** Hands the extracted text to the model, then opens the review screen. */
export function StructureButton() {
  const router = useRouter();
  const { structure, structuring, error, resume, doc, ai } = useSession();
  const empty = !doc || doc.sourceText.replace(/\s/g, "").length < 50;

  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
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
          className="flex-1 rounded-md border border-border bg-card px-4 py-2.5 font-mono text-[13px] hover:border-border-strong hover:bg-raised sm:flex-none sm:py-2"
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
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 font-mono text-[13px] text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60 sm:w-auto sm:py-2"
      >
        {structuring ? (
          <>
            <Loader2 aria-hidden className="size-4 animate-spin" />
            {ai.label} is structuring your resume…
          </>
        ) : (
          <>
            <Sparkles aria-hidden className="size-4" />
            {resume ? `Re-run ${ai.label} extraction` : `Continue: structure with ${ai.label}`}
            <ArrowRight aria-hidden className="size-4" />
          </>
        )}
      </button>
    </div>
  );
}
