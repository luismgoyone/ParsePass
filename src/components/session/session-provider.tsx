"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { ExtractError } from "@/lib/ats/errors";
import type { Diagnosis, ExtractedDoc } from "@/lib/ats/types";

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
}

interface SessionContextValue extends SessionState {
  /** False until sessionStorage has been read, so pages don't flash an empty state. */
  ready: boolean;
  source: SourcePreview | null;
  busy: boolean;
  error: string | null;
  ingestFile: (file: File) => Promise<boolean>;
  ingestText: (text: string) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

const STORAGE_KEY = "parsepass:session:v1";
const EMPTY: SessionState = { doc: null, diagnosis: null };

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<SourcePreview | null>(null);
  const [busy, setBusy] = useState(false);
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
        setState({ doc, diagnosis: diagnose(doc) });
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

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      ready,
      source,
      busy,
      error,
      ingestFile,
      ingestText,
      clearError: () => setError(null),
      reset: () => {
        setState(EMPTY);
        setSource(null);
      },
    }),
    [state, ready, source, busy, error, ingestFile, ingestText],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
