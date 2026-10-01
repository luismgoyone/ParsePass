import { AlignmentType, BorderStyle, Document, Paragraph, TextRun } from "docx";

import { BULLET, displayText, type Block } from "@/lib/resume/template";

import type { Density } from "./pdf-document";

const FONT = "Arial";
// Body size in half-points: 10 pt standard, 9.5 pt compact (see Density in pdf-document.tsx).
const BODY_SIZES: Record<Density, number> = { standard: 20, compact: 19 };

/** The ATS template as a native Word document: body paragraphs only, no header, footer or tables. */
export function buildResumeDocx(
  blocks: Block[],
  title: string,
  density: Density = "standard",
): Document {
  const BODY = BODY_SIZES[density];
  const paragraphs = blocks.map((block) => {
    const text = displayText(block);
    switch (block.kind) {
      case "name":
        return new Paragraph({
          children: [new TextRun({ text, bold: true, size: 32, font: FONT })],
        });
      case "heading":
        return new Paragraph({
          spacing: { before: 160, after: 60 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "111111", space: 1 } },
          children: [new TextRun({ text, bold: true, size: 21, font: FONT })],
        });
      case "title":
        return new Paragraph({
          spacing: { before: 80 },
          children: [
            new TextRun({ text: block.text, bold: true, size: BODY, font: FONT }),
            // A project link follows its name on the same line, in regular weight.
            ...(block.meta
              ? [new TextRun({ text: text.slice(block.text.length), size: BODY, font: FONT })]
              : []),
          ],
        });
      case "bullet":
        // A literal round bullet with a hanging indent: identical text to the PDF, no list numbering to lose.
        return new Paragraph({
          indent: { left: 360, hanging: 240 },
          children: [new TextRun({ text: `${BULLET}\t${block.text}`, size: BODY, font: FONT })],
          tabStops: [{ type: "left", position: 360 }],
        });
      default:
        return new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [new TextRun({ text, size: BODY, font: FONT })],
        });
    }
  });

  return new Document({
    title,
    creator: "ParsePass",
    styles: { default: { document: { run: { font: FONT, size: BODY } } } },
    sections: [
      {
        // 0.5" top/bottom, 0.6" sides (twips), matching the PDF.
        properties: {
          page: {
            margin:
              density === "compact"
                ? { top: 600, bottom: 600, left: 760, right: 760 }
                : { top: 720, bottom: 720, left: 864, right: 864 },
          },
        },
        children: paragraphs,
      },
    ],
  });
}
