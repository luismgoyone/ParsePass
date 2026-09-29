import type { Metadata } from "next";

import { DiagnosticView } from "@/components/diagnostic/diagnostic-view";

export const metadata: Metadata = { title: "Diagnostic · ParsePass" };

export default function DiagnosticPage() {
  return (
    <DiagnosticView
      next={
        <span className="rounded-md border border-border bg-card px-4 py-2 font-mono text-[13px] text-subtle-foreground">
          Structured review: coming next
        </span>
      }
    />
  );
}
