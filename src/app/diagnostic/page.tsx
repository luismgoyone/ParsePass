import type { Metadata } from "next";

import { DiagnosticView } from "@/components/diagnostic/diagnostic-view";
import { StructureButton } from "@/components/diagnostic/structure-button";

export const metadata: Metadata = { title: "Diagnostic · ParsePass" };

export default function DiagnosticPage() {
  return <DiagnosticView next={<StructureButton />} />;
}
