import { describe, expect, it } from "vitest";

import { diagnose } from "@/lib/ats/checks";
import { extractPlainText } from "@/lib/ats/extract";
import { classifyHeading, looksLikeHeading } from "@/lib/ats/sections";

const BASE = `Jordan Rivera
jordan.rivera@example.com
Experience
Engineer
Acme
Mar 2020 – Present
Education
B.S. Computer Science
Skills
TypeScript`;

const check = (text: string) => diagnose(extractPlainText(text));

describe("diagnose (plain text)", () => {
  it("passes a minimal standard resume", () => {
    expect(check(BASE).issues).toEqual([]);
  });

  it("flags missing sections", () => {
    const d = check(BASE.replace("Education\nB.S. Computer Science\n", ""));
    expect(d.issues.map((i) => i.rule)).toEqual(["SEC-01"]);
    expect(d.issues[0].title).toBe("Missing section: Education");
  });

  it("flags a missing email", () => {
    const d = check(BASE.replace("jordan.rivera@example.com\n", ""));
    expect(d.issues.map((i) => i.rule)).toEqual(["CON-01"]);
  });

  it("flags icon glyphs and emoji but not ©", () => {
    expect(check(`${BASE}\n✉ Email me`).issues.map((i) => i.rule)).toEqual(["ICO-01"]);
    expect(check(`${BASE}\n icon font`).issues.map((i) => i.rule)).toEqual(["ICO-01"]);
    expect(check(`${BASE}\n© 2025`).issues).toEqual([]);
  });

  it("passes a resume headed “Skills & Technologies” with no issues", () => {
    expect(
      check(BASE.replace("Skills\nTypeScript", "SKILLS & TECHNOLOGIES\nTypeScript")).issues,
    ).toEqual([]);
  });

  it("doesn't treat May as a different date format, with short or full month names", () => {
    expect(check(`${BASE}\nIntern\nGlobex\nJan 2019 – May 2019`).issues).toEqual([]);
    const full = BASE.replace("Mar 2020 – Present", "March 2020 – Present");
    expect(check(`${full}\nIntern\nGlobex\nJanuary 2019 – May 2019`).issues).toEqual([]);
  });

  it("flags mixed date formats as a notice", () => {
    const d = check(`${BASE}\nIntern\nGlobex\n06/2018 – 08/2018`);
    expect(d.issues[0]).toMatchObject({ rule: "DAT-01", severity: "notice" });
  });

  it("scores by severity", () => {
    const d = check(
      BASE.replace("jordan.rivera@example.com\n", "").replace(
        "Skills\nTypeScript",
        "My Toolbox\nTypeScript",
      ),
    );
    // CON-01 (warning, -10) + SEC-02 (notice, -4)
    expect(d.score).toBe(86);
  });
});

describe("section headings", () => {
  it("recognizes standard and creative headings", () => {
    expect(classifyHeading("PROFESSIONAL EXPERIENCE")).toEqual({
      section: "experience",
      standard: true,
    });
    expect(classifyHeading("Where I’ve Worked")).toEqual({
      section: "experience",
      standard: false,
    });
    expect(classifyHeading("Tech Stack:")).toEqual({ section: "skills", standard: false });
    expect(classifyHeading("Senior Engineer")).toBeNull();
  });

  it("accepts variations on a standard name", () => {
    expect(classifyHeading("SKILLS & TECHNOLOGIES")).toEqual({ section: "skills", standard: true });
    expect(classifyHeading("Relevant Work Experience")).toEqual({
      section: "experience",
      standard: true,
    });
    expect(classifyHeading("Education and Certifications")).toEqual({
      section: "education",
      standard: true,
    });
    // Creative names are still flagged.
    expect(classifyHeading("My Toolbox")).toEqual({ section: "skills", standard: false });
  });

  it("only treats short, heading-shaped text as a heading", () => {
    expect(looksLikeHeading("SKILLS")).toBe(true);
    expect(looksLikeHeading("Work Experience")).toBe(true);
    expect(looksLikeHeading("Built the checkout flow in React.")).toBe(false);
    expect(looksLikeHeading("jordan@example.com")).toBe(false);
  });
});
