import { AlignmentType, BorderStyle, Document, Paragraph, TextRun } from "docx";

import { BULLET, displayText, type Block } from "@/lib/resume/template";

const FONT = "Arial";
const BODY = 21; // half-points: 10.5 pt

/** The ATS template as a native Word document: body paragraphs only, no header, footer or tables. */
export function buildResumeDocx(blocks: Block[], title: string): Document {
  const paragraphs = blocks.map((block) => {
    const text = displayText(block);
    switch (block.kind) {
      case "name":
        return new Paragraph({
          children: [new TextRun({ text, bold: true, size: 36, font: FONT })],
        });
      case "heading":
        return new Paragraph({
          spacing: { before: 240, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "111111", space: 1 } },
          children: [new TextRun({ text, bold: true, size: 22, font: FONT })],
        });
      case "title":
        return new Paragraph({
          spacing: { before: 120 },
          children: [new TextRun({ text, bold: true, size: BODY, font: FONT })],
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
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1080, right: 1080 } } },
        children: paragraphs,
      },
    ],
  });
}
