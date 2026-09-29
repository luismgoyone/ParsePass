import { diagnose } from "@/lib/ats/checks";
import type { Diagnosis, ExtractedDoc } from "@/lib/ats/types";
import type { Resume } from "@/lib/resume/schema";
import { buildBlocks, exportBaseName, expectedText } from "@/lib/resume/template";

import { verifyExport } from "./verify";

export interface ExportResult {
  baseName: string;
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

  const [pdfBlob, docxBlob] = await Promise.all([
    pdf(<ResumePdf blocks={blocks} title={baseName} />).toBlob(),
    Packer.toBlob(buildResumeDocx(blocks, baseName)),
  ]);
  const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
  const after = await extractPdf(pdfBytes, `${baseName}.pdf`);

  return {
    baseName,
    pdf: pdfBlob,
    pdfBytes,
    docx: docxBlob,
    after,
    diagnosis: diagnose(after),
    verification: verifyExport(expectedText(blocks), after.lines),
  };
}
