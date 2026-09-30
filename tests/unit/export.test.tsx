import { renderToBuffer } from "@react-pdf/renderer";
import { Packer } from "docx";
import { describe, expect, it } from "vitest";

import { diagnose } from "@/lib/ats/checks";
import { extractDocx } from "@/lib/ats/extract-docx";
import { extractPdf } from "@/lib/ats/extract-pdf";
import { atsText } from "@/lib/ats/lines";
import { buildResumeDocx } from "@/lib/export/docx-document";
import { ResumePdf } from "@/lib/export/pdf-document";
import { verifyExport } from "@/lib/export/verify";
import type { Resume } from "@/lib/resume/schema";
import { buildBlocks, exportBaseName, expectedText, fullLink } from "@/lib/resume/template";

import jordan from "../fixtures/jordan-resume.json";

const resume = jordan as Resume;
const blocks = buildBlocks(resume);

describe("ATS template", () => {
  it("puts title, company and dates on their own lines, with one date format", () => {
    const text = expectedText(blocks);
    expect(text).toContain(
      "Senior Software Engineer\nBrightline Health | Portland, OR\nApr 2021 – Present\n• Led the rebuild",
    );
    expect(text).toContain(
      "Software Engineer\nCascade Commerce | Seattle, WA\nJun 2016 – Mar 2021",
    );
    expect(text).toContain("SKILLS\nTypeScript, React and Next.js, Node.js, PostgreSQL, AWS");
    expect(text.split("\n").slice(0, 3)).toEqual([
      "JORDAN RIVERA",
      "Senior Full-Stack Engineer",
      "jordan.rivera@example.com | +1 (415) 555-0142 | https://www.linkedin.com/in/jordan-rivera-dev",
    ]);
  });

  it("uses only standard headings", () => {
    const headings = blocks.filter((b) => b.kind === "heading").map((b) => b.text);
    expect(headings).toEqual(["Summary", "Experience", "Education", "Skills", "Certifications"]);
  });

  it("strips icons and stray bullet glyphs", () => {
    const r = structuredClone(resume);
    r.contact.phone = " +1 555 0100";
    r.experience[0].bullets = ["▪ Shipped 🚀 things"];
    const text = expectedText(buildBlocks(r));
    expect(text).toContain("+1 555 0100");
    expect(text).toContain("• Shipped things");
    expect(text).not.toMatch(/[🚀▪]/u);
  });

  it("names the file Firstname_Lastname_Resume", () => {
    expect(exportBaseName("JORDAN RIVERA")).toBe("Jordan_Rivera_Resume");
    // ASCII only: some ATS upload forms mangle accented file names.
    expect(exportBaseName("  José  de la Cruz ")).toBe("Jose_De_La_Cruz_Resume");
    expect(exportBaseName("")).toBe("Resume");
  });

  it("writes links out in full", () => {
    expect(fullLink("github.com/jordan")).toBe("https://github.com/jordan");
    expect(fullLink("https://x.dev")).toBe("https://x.dev");
    expect(fullLink("jordan@example.com")).toBe("jordan@example.com");
  });
});

describe("exported PDF", async () => {
  const pdf = await renderToBuffer(<ResumePdf blocks={blocks} title="Jordan_Rivera_Resume" />);
  const doc = await extractPdf(pdf, "Jordan_Rivera_Resume.pdf");

  it("re-extracts to exactly the edited fields", () => {
    const result = verifyExport(expectedText(blocks), doc.lines);
    expect(result.missing).toEqual([]);
    expect(result.match).toBe(true);
  });

  it("passes every ATS check", () => {
    expect(diagnose(doc)).toEqual({ issues: [], score: 100 });
  });

  it("reads top to bottom in one column", () => {
    const text = atsText(doc.lines);
    expect(text.indexOf("EXPERIENCE")).toBeLessThan(text.indexOf("EDUCATION"));
    expect(text.indexOf("EDUCATION")).toBeLessThan(text.indexOf("SKILLS"));
  });
});

describe("exported DOCX", async () => {
  const docx = await Packer.toBuffer(buildResumeDocx(blocks, "Jordan_Rivera_Resume"));
  const doc = await extractDocx(docx, "Jordan_Rivera_Resume.docx");

  it("has no header, tables, text boxes or columns", () => {
    expect(doc.docx).toMatchObject({
      tables: 0,
      textBoxes: 0,
      images: 0,
      columns: 1,
      headerText: "",
      footerText: "",
    });
  });

  it("passes every ATS check and keeps all the text", () => {
    expect(diagnose(doc).issues).toEqual([]);
    const result = verifyExport(expectedText(blocks), doc.lines);
    expect(result.missing).toEqual([]);
  });
});
