import { getDocumentProxy } from "unpdf";

import { linesFromItems } from "./lines";
import type { AtsLine, ExtractedDoc, HyperLink, PageSize, TextItem } from "./types";

interface RawTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
}

interface RawAnnotation {
  subtype: string;
  url?: string;
  rect: number[];
}

/** Extract text from a PDF the way an ATS does (pdf.js), keeping layout for the issue checks. */
export async function extractPdf(
  data: ArrayBuffer | Uint8Array,
  fileName: string,
): Promise<ExtractedDoc> {
  // pdf.js takes ownership of the buffer it's given (and rejects Node Buffers), so hand it a
  // plain Uint8Array copy.
  const bytes = new Uint8Array(data);
  const pdf = await getDocumentProxy(bytes);

  const pages: PageSize[] = [];
  const lines: AtsLine[] = [];
  const links: HyperLink[] = [];
  const fonts = new Set<string>();
  const stream: string[] = [];

  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const { width, height } = page.getViewport({ scale: 1 });
    pages.push({ width, height });

    const content = await page.getTextContent();
    const styles = content.styles as Record<string, { fontFamily?: string }>;
    const items: TextItem[] = [];
    let pageText = "";
    for (const raw of content.items as RawTextItem[]) {
      if (typeof raw.str !== "string") continue;
      pageText += raw.str + (raw.hasEOL ? "\n" : "");
      const [, , c, d, e, f] = raw.transform;
      const fontSize = Math.hypot(c, d) || raw.height || 10;
      const fontFamily = styles[raw.fontName]?.fontFamily ?? "";
      if (fontFamily) fonts.add(fontFamily);
      items.push({
        str: raw.str,
        x: e,
        y: height - f,
        width: raw.width,
        height: raw.height || fontSize,
        fontSize,
        fontFamily,
      });
    }
    stream.push(pageText.trim());
    lines.push(...linesFromItems(items, n));

    const annotations = (await page.getAnnotations()) as RawAnnotation[];
    for (const a of annotations) {
      if (a.subtype !== "Link" || !a.url) continue;
      const [x1, y1, x2, y2] = a.rect;
      const covered = items
        .filter((it) => {
          // Center of the glyphs in PDF (bottom-up) coordinates must fall inside the link box.
          const midY = height - it.y + it.fontSize * 0.35;
          const midX = it.x + it.width / 2;
          return midY >= y1 && midY <= y2 && midX >= x1 - 1 && midX <= x2 + 1;
        })
        .map((it) => it.str)
        .join("")
        .trim();
      links.push({ url: a.url, text: covered });
    }
  }

  await pdf.cleanup();

  return {
    kind: "pdf",
    fileName,
    pageCount: pages.length,
    pages,
    lines,
    sourceText: stream.join("\n\n"),
    links,
    fonts: [...fonts],
  };
}
