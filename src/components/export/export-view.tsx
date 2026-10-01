"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  FileText,
  FileType2,
  Loader2,
  PackageCheck,
  ScrollText,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AtsConsole, CopyButton } from "@/components/diagnostic/ats-console";
import { Loading, NeedsUpload } from "@/components/diagnostic/diagnostic-view";
import { PdfPages } from "@/components/diagnostic/source-preview";
import { useSession } from "@/components/session/session-provider";
import { atsText } from "@/lib/ats/lines";
import type { ExportResult } from "@/lib/export/generate";
import { buildChangeLog, type Change } from "@/lib/resume/changes";
import { checkHonesty } from "@/lib/resume/honesty";
import { cn } from "@/lib/utils";

export function ExportView() {
  const { ready, doc, diagnosis, resume, extracted } = useSession();
  const [result, setResult] = useState<ExportResult | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!resume) return;
    let cancelled = false;
    import("@/lib/export/generate")
      .then(({ generateExport }) => generateExport(resume))
      .then((r) => !cancelled && setResult(r))
      .catch((e) => {
        console.error("export failed", e);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [resume]);

  const changes = useMemo(
    () =>
      resume && doc && diagnosis
        ? buildChangeLog({
            issues: diagnosis.issues,
            extracted,
            resume,
            honesty: checkHonesty(resume, doc.sourceText),
          })
        : [],
    [resume, doc, diagnosis, extracted],
  );

  if (!ready) return <Loading />;
  if (!doc || !diagnosis) return <NeedsUpload />;
  if (!resume) return <NeedsUpload message="Structure and review your resume before exporting." />;
  if (failed) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-16 text-center">
        <AlertTriangle aria-hidden className="size-6 text-destructive" />
        <p>Something went wrong building the files. Go back to the editor and try again.</p>
        <Link href="/review" className="font-mono text-[13px] text-primary-text hover:underline">
          Back to Review & Edit
        </Link>
      </main>
    );
  }
  if (!result) {
    return (
      <main className="flex flex-1 items-center justify-center gap-2 p-16 font-mono text-xs text-muted-foreground">
        <Loader2 aria-hidden className="size-4 animate-spin" /> Building your PDF and DOCX, then
        re-reading them like an ATS…
      </main>
    );
  }

  const { after, verification } = result;
  const score = result.diagnosis.score;
  const pass = result.diagnosis.issues.length === 0;

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 md:px-6">
      <section
        className={cn(
          "flex flex-wrap items-center justify-between gap-4 rounded-lg border border-l-4 bg-panel p-5",
          pass ? "border-l-success" : "border-l-warning",
        )}
      >
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "flex size-11 items-center justify-center rounded-md border",
              pass ? "border-success/40 bg-success/10" : "border-warning/40 bg-warning/10",
            )}
          >
            <ShieldCheck
              aria-hidden
              className={cn("size-6", pass ? "text-success" : "text-warning")}
            />
          </span>
          <div>
            <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight">
              <span data-testid="export-score">
                ATS score: {score}/100 {pass ? "(pass)" : ""}
              </span>
              <span className="rounded-sm border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                was {diagnosis.score}/100
              </span>
            </h1>
            <p className="mt-1 text-muted-foreground">
              {pass
                ? "Single column, selectable text and standard headings. The exported file passes every check the original failed."
                : "The export still has issues. Review them below."}
            </p>
          </div>
        </div>
        <VerificationChip match={verification.match} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Pane title="Exported PDF" icon={FileText} meta={`${result.baseName}.pdf`}>
          <div className="overflow-auto bg-zinc-800/40 lg:max-h-[75vh]">
            <PdfPages bytes={result.pdfBytes} doc={after} issues={[]} selectedRule={null} />
          </div>
        </Pane>
        <Pane
          title="Re-extracted ATS view"
          icon={Terminal}
          meta={<CopyButton text={atsText(after.lines)} />}
        >
          <p className="border-b border-border bg-card/50 px-4 py-2 font-mono text-xs text-subtle-foreground">
            The exported PDF, read back with the same extractor used on your upload.
          </p>
          <AtsConsole
            lines={after.lines}
            issues={result.diagnosis.issues}
            className="lg:max-h-[75vh]"
          />
          {!verification.match && verification.missing.length > 0 && (
            <div className="border-t border-border bg-warning/10 px-4 py-2 font-mono text-xs text-amber-200">
              Not found in the re-extracted text: {verification.missing.slice(0, 3).join(" · ")}
            </div>
          )}
        </Pane>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <ChangeLog changes={changes} />
        <section
          aria-labelledby="package"
          className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-5"
        >
          <header className="flex items-center justify-between">
            <h2 id="package" className="flex items-center gap-2 text-lg font-medium">
              <PackageCheck aria-hidden className="size-4 text-primary-text" />
              Download
            </h2>
            <span className="rounded-sm border border-success/60 px-1.5 font-mono text-xs text-success">
              Ready
            </span>
          </header>
          <DownloadButton
            blob={result.pdf}
            fileName={`${result.baseName}.pdf`}
            label="Download PDF"
            note="Selectable text"
            primary
          />
          <DownloadButton
            blob={result.docx}
            fileName={`${result.baseName}.docx`}
            label="Download DOCX"
            note="Native Word"
          />
          <p className="mt-auto border-t border-border pt-3 font-mono text-xs text-subtle-foreground">
            Built in your browser. Nothing was uploaded or stored.
          </p>
          <Link
            href="/review"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            Back to Review & Edit
          </Link>
        </section>
      </div>
    </main>
  );
}

function VerificationChip({ match }: { match: boolean }) {
  return match ? (
    <span
      data-testid="export-verification"
      className="inline-flex items-center gap-2 rounded-md border border-emerald-600 bg-emerald-950/30 px-3 py-2 font-mono text-xs text-emerald-400"
    >
      <CheckCircle2 aria-hidden className="size-4" />
      Re-extracted text matches your edits exactly
    </span>
  ) : (
    <span
      data-testid="export-verification"
      className="inline-flex items-center gap-2 rounded-md border border-amber-600 bg-amber-950/30 px-3 py-2 font-mono text-xs text-amber-400"
    >
      <AlertTriangle aria-hidden className="size-4" />
      Some text didn&apos;t come back exactly
    </span>
  );
}

function ChangeLog({ changes }: { changes: Change[] }) {
  return (
    <section aria-labelledby="changes" className="rounded-lg border border-border bg-panel p-5">
      <header className="mb-3 flex items-center justify-between border-b border-border pb-3">
        <h2 id="changes" className="flex items-center gap-2 text-lg font-medium">
          <ScrollText aria-hidden className="size-4 text-primary-text" />
          What changed
        </h2>
        <span className="font-mono text-xs text-subtle-foreground">{changes.length} items</span>
      </header>
      <ul className="flex flex-col gap-3">
        {changes.map((c) => (
          <li key={c.title} className="flex gap-3">
            {c.kind === "review" ? (
              <AlertTriangle aria-label="Review" className="mt-0.5 size-4 shrink-0 text-warning" />
            ) : (
              <Check
                aria-hidden
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  c.kind === "edit" ? "text-primary-text" : "text-success",
                )}
              />
            )}
            <p>
              <strong className="font-semibold">{c.title}:</strong>{" "}
              <span className="text-muted-foreground">{c.detail}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DownloadButton({
  blob,
  fileName,
  label,
  note,
  primary,
}: {
  blob: Blob;
  fileName: string;
  label: string;
  note: string;
  primary?: boolean;
}) {
  // Create the object URL at click time so it can't be revoked by an effect cleanup first.
  const download = () => {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const Icon = fileName.endsWith(".pdf") ? FileText : FileType2;
  return (
    <button
      type="button"
      onClick={download}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md border px-4 py-3 text-left transition-colors",
        primary
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary-hover"
          : "border-border bg-card hover:border-border-strong hover:bg-raised",
      )}
    >
      <span className="flex items-center gap-3">
        <Icon aria-hidden className="size-5" />
        <span className="flex flex-col">
          <span className="font-mono text-[13px]">{label}</span>
          <span
            className={cn(
              "font-mono text-xs",
              primary ? "text-indigo-200" : "text-subtle-foreground",
            )}
          >
            {fileName} · {Math.max(1, Math.round(blob.size / 1024))} KB · {note}
          </span>
        </span>
      </span>
      <Download aria-hidden className="size-4" />
    </button>
  );
}

function Pane({
  title,
  icon: Icon,
  meta,
  children,
}: {
  title: string;
  icon: typeof FileText;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-panel">
      <header className="flex h-11 items-center justify-between gap-2 border-b border-border bg-card px-4">
        <h2 className="flex items-center gap-2 font-mono text-[13px]">
          <Icon aria-hidden className="size-4 text-muted-foreground" />
          {title}
        </h2>
        {typeof meta === "string" ? (
          <span className="font-mono text-xs text-subtle-foreground">{meta}</span>
        ) : (
          meta
        )}
      </header>
      {children}
    </section>
  );
}
