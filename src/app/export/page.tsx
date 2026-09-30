import type { Metadata } from "next";

import { ExportView } from "@/components/export/export-view";

export const metadata: Metadata = { title: "Export · ParsePass" };

export default function ExportPage() {
  return <ExportView />;
}
