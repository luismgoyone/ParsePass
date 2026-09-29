"use client";

import { FileUp, FolderOpen, Lock, NotebookText, Terminal } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

type Mode = "file" | "text";

export function UploadPanel() {
  const [mode, setMode] = useState<Mode>("file");
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputId = useId();

  return (
    <section
      id="upload"
      className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-panel shadow-2xl shadow-black/40"
    >
      <div className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
        <span className="flex items-center gap-2 font-mono text-[13px]">
          <Terminal aria-hidden className="size-4 text-subtle-foreground" />
          SOURCE_RESUME
        </span>
        <div role="tablist" className="flex rounded-md border border-border bg-console p-0.5">
          <ModeTab active={mode === "file"} onClick={() => setMode("file")} icon={FileUp}>
            Upload file
          </ModeTab>
          <ModeTab active={mode === "text"} onClick={() => setMode("text")} icon={NotebookText}>
            Paste plain text
          </ModeTab>
        </div>
      </div>

      {mode === "file" ? (
        <div className="p-6">
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
            }}
            className={cn(
              "group flex w-full cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-border bg-console px-6 py-10 text-center transition-colors hover:border-primary",
              dragging && "border-primary bg-primary/5",
            )}
          >
            <input id={inputId} type="file" accept=".pdf,.docx" className="sr-only" />
            <span className="mb-4 flex size-14 items-center justify-center rounded-lg border border-border bg-raised text-primary-text transition-transform group-hover:scale-105">
              <FileUp aria-hidden className="size-6" />
            </span>
            <span className="mb-1 flex items-center gap-2">
              <span className="text-lg font-medium">Drag and drop your resume</span>
              <span className="rounded-sm border border-border bg-card px-2 py-0.5 font-mono text-xs text-muted-foreground">
                PDF, DOCX
              </span>
            </span>
            <span className="mb-4 text-muted-foreground">
              Text is extracted in your browser. Max 5 MB.
            </span>
            <span className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-mono text-[13px] text-primary-foreground transition-colors group-hover:bg-primary-hover">
              <FolderOpen aria-hidden className="size-4" />
              Browse files
            </span>
          </label>
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-6">
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
              disabled={text.trim().length === 0}
              className="rounded-md bg-primary px-4 py-1.5 font-mono text-[13px] text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              Check this text
            </button>
          </div>
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
        "flex items-center gap-1.5 rounded-sm border px-3 py-1 font-mono text-xs transition-colors",
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
  return (
    <div className="mx-6 mb-6 flex items-center gap-3 rounded-md border border-border bg-console p-3.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-success/30 bg-success/10">
        <Lock aria-hidden className="size-4 text-success" />
      </span>
      <p>
        <strong className="font-semibold text-success">Privacy:</strong> your resume is processed in
        memory, sent only to the Claude API to structure it, and never stored.
      </p>
    </div>
  );
}
