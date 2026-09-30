import { ExtractError, MAX_UPLOAD_BYTES } from "./errors";
import { extractDocx } from "./extract-docx";
import { extractPdf } from "./extract-pdf";
import { linesFromText } from "./lines";
import type { ExtractedDoc, SourceKind } from "./types";

export function kindForFile(name: string, type = ""): SourceKind | null {
  if (type === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.docx$/i.test(name)
  )
    return "docx";
  return null;
}

/** Extract a PDF or DOCX file. Throws ExtractError with a user-facing message. */
export async function extractFile(file: {
  name: string;
  type?: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}): Promise<ExtractedDoc> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ExtractError(
      "That file is over 5 MB. Try exporting a smaller PDF, or paste the text.",
      "too-large",
    );
  }
  const kind = kindForFile(file.name, file.type);
  if (!kind) {
    throw new ExtractError(
      /\.doc$/i.test(file.name)
        ? "Old .doc files aren't supported. Save it as .docx or PDF, or paste the text."
        : "Upload a PDF or DOCX file, or paste the text.",
      "unsupported",
    );
  }
  const data = await file.arrayBuffer();
  try {
    return kind === "pdf" ? await extractPdf(data, file.name) : await extractDocx(data, file.name);
  } catch {
    throw new ExtractError(
      `We couldn't read that ${kind.toUpperCase()}. It may be damaged or password-protected. Try re-exporting it, or paste the text.`,
      "unreadable",
    );
  }
}

/** Pasted plain text: no layout to inspect, so only content checks apply. */
export function extractPlainText(text: string): ExtractedDoc {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) throw new ExtractError("Paste some resume text first.", "empty");
  return {
    kind: "text",
    fileName: "Pasted text",
    pageCount: 1,
    pages: [],
    lines: linesFromText(clean),
    sourceText: clean,
    links: [],
    fonts: [],
  };
}
