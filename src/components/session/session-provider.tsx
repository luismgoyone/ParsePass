"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { ExtractError } from "@/lib/ats/errors";
import type { AiInfo } from "@/lib/extraction/provider";
import type { Diagnosis, ExtractedDoc } from "@/lib/ats/types";
import type { Resume } from "@/lib/resume/schema";

/** The original file, kept in memory only so the diagnostic screen can show it. */
export interface SourcePreview {
  kind: ExtractedDoc["kind"];
  fileName: string;
  size: number;
  bytes?: Uint8Array;
  text?: string;
}

export interface SessionState {
  doc: ExtractedDoc | null;
  diagnosis: Diagnosis | null;
  /** The resume being edited. */
  resume: Resume | null;
  /** The model's untouched extraction, to revert edits and to build the change log. */
  extracted: Resume | null;
  model: string | null;
}

interface SessionContextValue extends SessionState {
  /** Which model provider structures resumes, for UI copy. */
  ai: AiInfo;
  /** False until sessionStorage has been read, so pages don't flash an empty state. */
  ready: boolean;
  source: SourcePreview | null;
  busy: boolean;
  error: string | null;
  ingestFile: (file: File) => Promise<boolean>;
  ingestText: (text: string) => Promise<boolean>;
  /** Send the extracted text to the model and store the structured resume. */
  structure: () => Promise<boolean>;
  structuring: boolean;
  setResume: (resume: Resume) => void;
  revertResume: () => void;
  clearError: () => void;
  reset: () => void;
}

const STORAGE_KEY = "parsepass:session:v1";
const EMPTY: SessionState = {
  doc: null,
  diagnosis: null,
  resume: null,
  extracted: null,
  model: null,
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ ai, children }: { ai: AiInfo; children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<SourcePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [structuring, setStructuring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      // Reading browser storage has to wait until after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setState({ ...EMPTY, ...(JSON.parse(saved) as SessionState) });
    } catch {
      // Storage can be unavailable (private mode); the session just won't survive a reload.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      if (state.doc) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // See above.
    }
  }, [state, ready]);

  const run = useCallback(
    async (load: () => Promise<{ doc: ExtractedDoc; preview: SourcePreview }>) => {
      setBusy(true);
      setError(null);
      try {
        const [{ doc, preview }, { diagnose }] = await Promise.all([
          load(),
          import("@/lib/ats/checks"),
        ]);
        setState({ ...EMPTY, doc, diagnosis: diagnose(doc) });
        setSource(preview);
        return true;
      } catch (e) {
        setError(
          e instanceof ExtractError
            ? e.message
            : "Something went wrong reading that file. Try again, or paste the text.",
        );
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const ingestFile = useCallback(
    (file: File) =>
      run(async () => {
        // pdf.js and mammoth are large; load them only when someone uploads.
        const { extractFile } = await import("@/lib/ats/extract");
        const doc = await extractFile(file);
        const bytes = new Uint8Array(await file.arrayBuffer());
        return { doc, preview: { kind: doc.kind, fileName: file.name, size: file.size, bytes } };
      }),
    [run],
  );

  const ingestText = useCallback(
    (text: string) =>
      run(async () => {
        const { extractPlainText } = await import("@/lib/ats/extract");
        const doc = extractPlainText(text);
        return { doc, preview: { kind: "text", fileName: doc.fileName, size: text.length, text } };
      }),
    [run],
  );

  const structure = useCallback(async () => {
    if (!state.doc) return false;
    setStructuring(true);
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: state.doc.sourceText, links: state.doc.links }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        resume?: Resume;
        model?: string;
        error?: string;
      };
      if (!res.ok || !data.resume) {
        setError(data.error ?? `${ai.label} couldn't structure this resume. Try again.`);
        return false;
      }
      setState((s) => ({
        ...s,
        resume: data.resume!,
        extracted: data.resume!,
        model: data.model ?? null,
      }));
      return true;
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      return false;
    } finally {
      setStructuring(false);
    }
  }, [state.doc, ai.label]);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      ai,
      ready,
      source,
      busy,
      error,
      ingestFile,
      ingestText,
      structure,
      structuring,
      setResume: (resume) => setState((s) => ({ ...s, resume })),
      revertResume: () => setState((s) => ({ ...s, resume: s.extracted })),
      clearError: () => setError(null),
      reset: () => {
        setState(EMPTY);
        setSource(null);
      },
    }),
    [state, ai, ready, source, busy, error, ingestFile, ingestText, structure, structuring],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
