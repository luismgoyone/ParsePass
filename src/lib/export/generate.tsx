import { diagnose } from "@/lib/ats/checks";
import type { Diagnosis, ExtractedDoc } from "@/lib/ats/types";
import type { Resume } from "@/lib/resume/schema";
import { buildBlocks, exportBaseName, expectedText } from "@/lib/resume/template";

import { fitToOnePage } from "./fit";
import type { Density } from "./pdf-document";
import { verifyExport } from "./verify";

export interface ExportResult {
  baseName: string;
  /** "compact" when the standard 10 pt layout ran past one page. */
  density: Density;
  pdf: Blob;
  pdfBytes: Uint8Array;
  docx: Blob;
  /** The exported PDF, read back with the same extractor used on the upload. */
  after: ExtractedDoc;
  diagnosis: Diagnosis;
  verification: { match: boolean; missing: string[] };
}

/** Render the resume to PDF and DOCX in the browser, then prove the PDF parses. */
export async function generateExport(resume: Resume): Promise<ExportResult> {
  const blocks = buildBlocks(resume);
  const baseName = exportBaseName(resume.contact.name);

  // Renderers and pdf.js are large: load them only on the export screen.
  const [{ pdf }, { ResumePdf }, { Packer }, { buildResumeDocx }, { extractPdf }] =
    await Promise.all([
      import("@react-pdf/renderer"),
      import("./pdf-document"),
      import("docx"),
      import("./docx-document"),
      import("@/lib/ats/extract-pdf"),
    ]);

  const fitted = await fitToOnePage(
    async (density) =>
      new Uint8Array(
        await (
          await pdf(<ResumePdf blocks={blocks} title={baseName} density={density} />).toBlob()
        ).arrayBuffer(),
      ),
    (bytes) => extractPdf(bytes, `${baseName}.pdf`),
  );
  const pdfBytes = fitted.bytes;
  const pdfBlob = new Blob([pdfBytes.slice().buffer as ArrayBuffer], { type: "application/pdf" });
  const docxBlob = await Packer.toBlob(buildResumeDocx(blocks, baseName, fitted.density));
  const after = fitted.doc;

  return {
    baseName,
    density: fitted.density,
    pdf: pdfBlob,
    pdfBytes,
    docx: docxBlob,
    after,
    diagnosis: diagnose(after),
    verification: verifyExport(expectedText(blocks), after.lines),
  };
}
