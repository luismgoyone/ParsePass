"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { SourcePreview as Source } from "@/components/session/session-provider";
import type { AtsIssue, ExtractedDoc } from "@/lib/ats/types";
import { cn } from "@/lib/utils";

import { SEVERITY_STYLES } from "./severity";

/** The resume as a person sees it, with the selected issue drawn on top. */
export function SourcePreview({
  source,
  doc,
  issues,
  selectedRule,
}: {
  source: Source | null;
  doc: ExtractedDoc;
  issues: AtsIssue[];
  selectedRule: string | null;
}) {
  if (!source || (source.kind !== "text" && !source.bytes)) {
    return (
      <p className="p-8 text-center text-muted-foreground">
        The original file isn&apos;t kept after a page reload. The ATS view on the right is still
        accurate; upload the file again to see it here.
      </p>
    );
  }
  if (source.kind === "pdf")
    return <PdfPages bytes={source.bytes!} doc={doc} issues={issues} selectedRule={selectedRule} />;
  if (source.kind === "docx") return <DocxPage bytes={source.bytes!} doc={doc} />;
  return (
    <div className="m-2 bg-white p-4 text-zinc-900 shadow-lg sm:m-4 sm:p-8">
      <pre className="font-sans text-sm whitespace-pre-wrap">{source.text}</pre>
    </div>
  );
}

export function PdfPages({
  bytes,
  doc,
  issues,
  selectedRule,
}: {
  bytes: Uint8Array;
  doc: ExtractedDoc;
  issues: AtsIssue[];
  selectedRule: string | null;
}) {
  const [pages, setPages] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getDocumentProxy } = await import("unpdf");
        const pdf = await getDocumentProxy(new Uint8Array(bytes));
        const urls: string[] = [];
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvas, viewport }).promise;
          urls.push(canvas.toDataURL("image/png"));
        }
        if (!cancelled) setPages(urls);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bytes]);

  if (failed)
    return (
      <p className="p-8 text-center text-muted-foreground">
        This PDF couldn&apos;t be rendered for preview.
      </p>
    );
  if (!pages) {
    return (
      <p className="flex items-center justify-center gap-2 p-8 font-mono text-xs text-muted-foreground">
        <Loader2 aria-hidden className="size-4 animate-spin" /> Rendering pages…
      </p>
    );
  }

  const columns = issues.find((i) => i.rule === "LAY-01" && i.columnX !== undefined);
  const selected = issues.find((i) => i.rule === selectedRule);

  return (
    <div className="flex flex-col gap-4 p-2 sm:p-4">
      {pages.map((src, p) => {
        const size = doc.pages[p];
        const pct = (v: number, of: number) => `${(v / of) * 100}%`;
        const flagged = (selected?.lines ?? [])
          .map((i) => doc.lines[i])
          .filter((l) => l && l.page === p + 1 && l.y !== undefined);
        return (
          <div key={p} className="relative mx-auto w-full max-w-[640px] bg-white shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element -- a rendered canvas, not a static asset */}
            <img src={src} alt={`Page ${p + 1} of the uploaded resume`} className="block w-full" />
            {size && columns?.columnX !== undefined && columnSpan(columns, doc, p + 1) && (
              <div
                aria-hidden
                className="absolute border-l-2 border-dashed border-destructive"
                style={{
                  left: pct(columns.columnX - 6, size.width),
                  top: pct(columnSpan(columns, doc, p + 1)!.top, size.height),
                  height: pct(columnSpan(columns, doc, p + 1)!.height, size.height),
                }}
              >
                <span className="absolute top-0 left-1 rounded-sm bg-destructive px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-white">
                  LAY-01<span className="hidden sm:inline"> · parser reads straight across</span>
                </span>
              </div>
            )}
            {size &&
              selected &&
              flagged.map((l, k) => {
                const left = Math.min(...l.segments.map((s) => s.x));
                const right = Math.max(...l.segments.map((s) => s.right));
                return (
                  <div
                    key={k}
                    aria-hidden
                    className={cn(
                      "absolute border-l-2 opacity-80",
                      SEVERITY_STYLES[selected.severity].lineActive,
                    )}
                    style={{
                      left: pct(left - 3, size.width),
                      width: pct(right - left + 6, size.width),
                      top: pct(l.y! - 11, size.height),
                      height: pct(15, size.height),
                    }}
                  />
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

/** Vertical extent (in points) of the lines where the two columns share a line. */
function columnSpan(issue: AtsIssue, doc: ExtractedDoc, page: number) {
  const ys = issue.lines
    .map((i) => doc.lines[i])
    .filter((l) => l?.page === page && l.y !== undefined)
    .map((l) => l.y!);
  if (ys.length === 0) return null;
  const top = Math.min(...ys) - 24;
  return { top, height: Math.max(...ys) - top + 10 };
}

function DocxPage({ bytes, doc }: { bytes: Uint8Array; doc: ExtractedDoc }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mammoth = (await import("mammoth")).default;
      const arrayBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      const result = await mammoth.convertToHtml({ arrayBuffer });
      // Links are shown, not followed: drop hrefs so nothing in an uploaded file is clickable.
      if (!cancelled) setHtml(result.value.replace(/\s(href|src)="(?!data:image\/)[^"]*"/g, ""));
    })().catch(() => !cancelled && setHtml(""));
    return () => {
      cancelled = true;
    };
  }, [bytes]);

  const header = doc.docx?.headerText;
  return (
    <div className="m-2 bg-white p-4 text-zinc-900 shadow-lg sm:m-4 sm:p-8">
      {header && (
        <div className="relative mb-6 border-2 border-dashed border-warning bg-amber-50 p-3 pt-5 text-sm">
          <span className="absolute -top-3 left-3 rounded-sm bg-warning px-1.5 font-mono text-[10px] text-zinc-900">
            PAGE HEADER · skipped by most ATS
          </span>
          <p className="whitespace-pre-wrap">{header}</p>
        </div>
      )}
      {html === null ? (
        <p className="font-mono text-xs text-zinc-500">Rendering document…</p>
      ) : (
        <div
          className="text-sm leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mt-3 [&_h2]:font-bold [&_p]:my-1 [&_strong]:font-semibold [&_table]:my-2 [&_table]:outline-2 [&_table]:outline-offset-2 [&_table]:outline-destructive [&_table]:outline-dashed [&_td]:border [&_td]:border-zinc-300 [&_td]:px-2 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
