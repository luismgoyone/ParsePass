import { renderToBuffer } from "@react-pdf/renderer";
import { Packer } from "docx";
import { describe, expect, it } from "vitest";

import { diagnose } from "@/lib/ats/checks";
import { extractDocx } from "@/lib/ats/extract-docx";
import { extractPdf } from "@/lib/ats/extract-pdf";
import { atsText } from "@/lib/ats/lines";
import { buildResumeDocx } from "@/lib/export/docx-document";
import { fitToOnePage } from "@/lib/export/fit";
import type { Density } from "@/lib/export/pdf-document";
import { ResumePdf } from "@/lib/export/pdf-document";
import { verifyExport } from "@/lib/export/verify";
import type { ExtractedDoc } from "@/lib/ats/types";
import type { Resume } from "@/lib/resume/schema";
import { buildBlocks, exportBaseName, expectedText, fullLink } from "@/lib/resume/template";

import jordan from "../fixtures/jordan-resume.json";

const resume = jordan as Resume;
const blocks = buildBlocks(resume);

describe("ATS template", () => {
  it("puts the job title on its own line, then company and dates, with one date format", () => {
    const text = expectedText(blocks);
    expect(text).toContain(
      "Senior Software Engineer\nBrightline Health | Portland, OR | Apr 2021 – Present\n• Led the rebuild",
    );
    expect(text).toContain(
      "Software Engineer\nCascade Commerce | Seattle, WA | Jun 2016 – Mar 2021",
    );
    expect(text).toContain("B.S. Computer Science\nUniversity of Oregon | 2012 – 2016");
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

  it("puts a project's link on the same line as its name", () => {
    const r = structuredClone(resume);
    r.projects = [{ name: "ParsePass", link: "github.com/x/parsepass", bullets: ["ATS checker."] }];
    expect(expectedText(buildBlocks(r))).toContain(
      "PROJECTS\nParsePass | https://github.com/x/parsepass\n• ATS checker.",
    );
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

describe("fitToOnePage", () => {
  const fakeDoc = (pageCount: number) => ({ pageCount }) as unknown as ExtractedDoc;
  const run = async (pages: Record<Density, number>) => {
    const rendered: Density[] = [];
    const result = await fitToOnePage(
      async (d) => {
        rendered.push(d);
        return new TextEncoder().encode(d);
      },
      async (bytes) => fakeDoc(pages[new TextDecoder().decode(bytes) as Density]),
    );
    return { density: result.density, rendered };
  };

  it("keeps the standard layout when it already fits", async () => {
    expect(await run({ standard: 1, compact: 1 })).toEqual({
      density: "standard",
      rendered: ["standard"],
    });
  });

  it("switches to compact when that saves a page", async () => {
    expect(await run({ standard: 2, compact: 1 })).toEqual({
      density: "compact",
      rendered: ["standard", "compact"],
    });
  });

  it("stays standard when compact doesn't save a page", async () => {
    expect((await run({ standard: 3, compact: 3 })).density).toBe("standard");
  });
});

describe("a resume too long for one page at 10 pt", async () => {
  // Fictional: the sample resume with more roles and bullets.
  const long = structuredClone(resume);
  const extraBullets = [
    "Partnered with design to rebuild the onboarding flow, cutting drop-off by 18% across web and mobile.",
    "Introduced end-to-end tests that caught regressions before release and shortened QA cycles by two days.",
  ];
  long.experience = [...long.experience, ...long.experience, ...long.experience].map((job, i) => ({
    ...job,
    company: `${job.company} ${i + 1}`,
    bullets: [...job.bullets, ...extraBullets],
  }));
  const longBlocks = buildBlocks(long);
  const fitted = await fitToOnePage(
    async (density) =>
      new Uint8Array(
        await renderToBuffer(<ResumePdf blocks={longBlocks} title="Long" density={density} />),
      ),
    (bytes) => extractPdf(bytes, "long.pdf"),
  );

  it("uses the compact layout only because it saves a page", async () => {
    const standard = await extractPdf(
      new Uint8Array(await renderToBuffer(<ResumePdf blocks={longBlocks} title="Long" />)),
      "standard.pdf",
    );
    expect(standard.pageCount).toBeGreaterThan(1);
    expect(fitted.density).toBe("compact");
    expect(fitted.doc.pageCount).toBeLessThan(standard.pageCount);
  });

  it("still re-extracts to exactly the same text and passes every ATS check", () => {
    expect(verifyExport(expectedText(longBlocks), fitted.doc.lines).missing).toEqual([]);
    expect(diagnose(fitted.doc).issues).toEqual([]);
  });
});
