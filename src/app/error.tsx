"use client";

import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <AlertTriangle aria-hidden className="size-6 text-destructive" />
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong.</h1>
      <p className="max-w-md text-muted-foreground">
        Nothing was saved, so there&apos;s nothing to lose. Try again, or start over with your file.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 font-mono text-[13px] text-primary-foreground hover:bg-primary-hover"
        >
          Try again
        </button>
        {/* A full reload clears any bad in-memory state. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="rounded-md border border-border bg-card px-4 py-2 font-mono text-[13px] hover:bg-raised"
        >
          Start over
        </a>
      </div>
    </main>
  );
}
