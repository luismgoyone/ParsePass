"use client";

import {
  AlertTriangle,
  FileUp,
  FolderOpen,
  Loader2,
  Lock,
  NotebookText,
  Sparkles,
  Terminal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { useSession } from "@/components/session/session-provider";
import { cn } from "@/lib/utils";

type Mode = "file" | "text";

export const SAMPLE_RESUME = "/samples/Jordan_Rivera_Designed_Resume.pdf";

export function UploadPanel() {
  const router = useRouter();
  const { ingestFile, ingestText, busy, error, clearError } = useSession();
  const [mode, setMode] = useState<Mode>("file");
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputId = useId();

  async function handleFile(file: File | undefined) {
    if (!file || busy) return;
    if (await ingestFile(file)) router.push("/diagnostic");
  }

  async function handleText() {
    if (await ingestText(text)) router.push("/diagnostic");
  }

  async function trySample() {
    const res = await fetch(SAMPLE_RESUME);
    const blob = await res.blob();
    await handleFile(
      new File([blob], SAMPLE_RESUME.split("/").pop()!, { type: "application/pdf" }),
    );
  }

  return (
    <section
      id="upload"
      aria-busy={busy}
      className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-panel shadow-2xl shadow-black/40"
    >
      <div className="flex h-12 items-center justify-between gap-3 border-b border-border bg-card px-2 sm:px-4">
        <span className="hidden items-center gap-2 font-mono text-[13px] sm:flex">
          <Terminal aria-hidden className="size-4 text-subtle-foreground" />
          SOURCE_RESUME
        </span>
        <div
          role="tablist"
          className="flex flex-1 rounded-md border border-border bg-console p-0.5 sm:flex-none"
        >
          <ModeTab active={mode === "file"} onClick={() => setMode("file")} icon={FileUp}>
            Upload file
          </ModeTab>
          <ModeTab active={mode === "text"} onClick={() => setMode("text")} icon={NotebookText}>
            Paste plain text
          </ModeTab>
        </div>
      </div>

      {mode === "file" ? (
        <div className="p-3 sm:p-6">
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void handleFile(e.dataTransfer.files[0]);
            }}
            className={cn(
              "group flex w-full cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-border bg-console px-4 py-8 text-center transition-colors hover:border-primary sm:px-6 sm:py-10",
              dragging && "border-primary bg-primary/5",
              busy && "pointer-events-none opacity-70",
            )}
          >
            <input
              id={inputId}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              aria-label="Resume file"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <span className="mb-4 flex size-14 items-center justify-center rounded-lg border border-border bg-raised text-primary-text transition-transform group-hover:scale-105">
              {busy ? (
                <Loader2 aria-hidden className="size-6 animate-spin" />
              ) : (
                <FileUp aria-hidden className="size-6" />
              )}
            </span>
            <span className="mb-1 flex items-center gap-2">
              <span className="text-lg font-medium">
                {busy ? (
                  "Extracting text…"
                ) : (
                  <>
                    {/* Phones have nothing to drag. */}
                    <span className="sm:hidden">Choose your resume</span>
                    <span className="hidden sm:inline">Drag and drop your resume</span>
                  </>
                )}
              </span>
              <span className="rounded-sm border border-border bg-card px-2 py-0.5 font-mono text-xs text-muted-foreground">
                PDF, DOCX
              </span>
            </span>
            <span className="mb-4 text-muted-foreground">
              Text is extracted in your browser. Max 5 MB.
            </span>
            <span className="flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-mono text-[13px] text-primary-foreground transition-colors group-hover:bg-primary-hover">
                <FolderOpen aria-hidden className="size-4" />
                Browse files
              </span>
              <span className="font-mono text-xs text-subtle-foreground">or</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  void trySample();
                }}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 font-mono text-[13px] text-foreground transition-colors hover:border-border-strong hover:bg-raised"
              >
                <Sparkles aria-hidden className="size-4 text-primary-text" />
                Try a sample resume
              </button>
            </span>
          </label>
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-3 sm:p-6">
          <div className="flex items-center justify-between font-mono text-xs text-subtle-foreground">
            <label htmlFor={`${inputId}-text`}>PLAIN_TEXT</label>
            <span>{text.length.toLocaleString()} characters</span>
          </div>
          <textarea
            id={`${inputId}-text`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Paste your resume as plain text…"
            className="w-full rounded-md border border-border bg-console p-3 font-mono text-[13px] placeholder:text-subtle-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setText("")}
              className="rounded-md border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={busy || text.trim().length === 0}
              onClick={() => void handleText()}
              className="rounded-md bg-primary px-4 py-1.5 font-mono text-[13px] text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              Check this text
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mx-3 mb-4 flex items-start gap-3 rounded-md border border-l-2 border-destructive/40 border-l-destructive bg-destructive/10 p-3 sm:mx-6"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={clearError}
            className="font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      <PrivacyNote />
    </section>
  );
}

function ModeTab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof FileUp;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-sm border px-3 py-1.5 font-mono text-xs whitespace-nowrap transition-colors sm:flex-none sm:py-1",
        active
          ? "border-border-strong bg-raised text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {children}
    </button>
  );
}

export function PrivacyNote() {
  const { ai } = useSession();
  return (
    <div className="mx-3 mb-3 flex items-center gap-3 rounded-md border border-border bg-console p-3.5 sm:mx-6 sm:mb-6">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-success/30 bg-success/10">
        <Lock aria-hidden className="size-4 text-success" />
      </span>
      <p>
        <strong className="font-semibold text-success">Privacy:</strong> your resume is processed in
        memory and never stored. {ai.privacy}
      </p>
    </div>
  );
}
