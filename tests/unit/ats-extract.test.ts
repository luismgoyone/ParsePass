import { describe, expect, it } from "vitest";

import { diagnose } from "@/lib/ats/checks";
import { extractDocx } from "@/lib/ats/extract-docx";
import { extractPdf } from "@/lib/ats/extract-pdf";
import { atsText } from "@/lib/ats/lines";

import { fixture } from "./fixtures";

const rules = (d: ReturnType<typeof diagnose>) => d.issues.map((i) => i.rule);

describe("two-column designed PDF", async () => {
  const doc = await extractPdf(fixture("two-column.pdf"), "two-column.pdf");
  const diagnosis = diagnose(doc);

  it("interleaves the columns in the ATS view, like a line-by-line parser", () => {
    const text = atsText(doc.lines);
    expect(text).toMatch(/AWS Senior Software Engineer 04\/21 – Present/);
    expect(text).toMatch(/CERTIFICATIONS Cascade Commerce/);
  });

  it("keeps content order in the source text sent to Claude", () => {
    expect(doc.sourceText).toContain("Senior Software Engineer");
    expect(doc.sourceText).not.toMatch(/AWS Senior Software Engineer/);
  });

  it("flags the column layout, ambiguous dates, creative headings and a hidden link", () => {
    expect(rules(diagnosis)).toEqual(["LAY-01", "DAT-01", "SEC-02", "LNK-01"]);
    const columns = diagnosis.issues[0];
    expect(columns.severity).toBe("critical");
    expect(columns.lines.length).toBeGreaterThan(4);
    expect(columns.columnX).toBeGreaterThan(100);
    expect(diagnosis.issues[1]).toMatchObject({
      severity: "warning",
      title: "Ambiguous date format",
    });
    expect(diagnosis.issues[2].detail).toContain("“MY TOOLBOX” → “Skills”");
  });

  it("reads the visible text of a link without its neighbours", () => {
    expect(doc.links).toEqual([
      { url: "https://www.linkedin.com/in/jordan-rivera-dev", text: "LinkedIn" },
    ]);
  });

  it("scores below a clean resume", () => {
    expect(diagnosis.score).toBeLessThan(70);
  });
});

describe("clean single-column PDF", async () => {
  const doc = await extractPdf(fixture("clean.pdf"), "clean.pdf");

  it("reads top to bottom with no issues", () => {
    const diagnosis = diagnose(doc);
    expect(diagnosis.issues).toEqual([]);
    expect(diagnosis.score).toBe(100);
    expect(doc.lines[0].text).toBe("Jordan Rivera");
  });
});

describe("image-only PDF", async () => {
  const doc = await extractPdf(fixture("image-only.pdf"), "image-only.pdf");

  it("is flagged as having no selectable text and scores zero", () => {
    const diagnosis = diagnose(doc);
    expect(rules(diagnosis)).toEqual(["TXT-01"]);
    expect(diagnosis.score).toBe(0);
  });
});

describe("DOCX with a header, a table and a hidden link", async () => {
  const doc = await extractDocx(fixture("issues.docx"), "issues.docx");
  const diagnosis = diagnose(doc);

  it("finds the structure plain text extraction can't see", () => {
    expect(doc.docx).toMatchObject({ tables: 1, columns: 1, textBoxes: 0 });
    expect(doc.docx?.headerText).toContain("jordan.rivera@example.com");
  });

  it("leaves the page header out of the ATS view but keeps it for Claude", () => {
    expect(atsText(doc.lines)).not.toContain("jordan.rivera@example.com");
    expect(doc.sourceText).toContain("jordan.rivera@example.com");
  });

  it("flags the table, the header contact details, the heading and the link", () => {
    expect(rules(diagnosis)).toEqual(["LAY-02", "HDR-01", "SEC-02", "LNK-01"]);
    expect(diagnosis.issues[0].lines.map((i) => doc.lines[i].text)).toEqual([
      "TypeScript",
      "Expert",
      "PostgreSQL",
      "Advanced",
    ]);
    expect(diagnosis.issues[1].title).toBe("Contact details in the page header");
    expect(diagnosis.issues[2].detail).toContain("“About Me” → “Summary”");
  });
});

describe("clean DOCX", async () => {
  const doc = await extractDocx(fixture("clean.docx"), "clean.docx");

  it("has no issues", () => {
    expect(diagnose(doc).issues).toEqual([]);
  });
});
