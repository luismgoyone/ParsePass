import { describe, expect, it } from "vitest";

import { checkHonesty } from "@/lib/resume/honesty";
import type { Resume } from "@/lib/resume/schema";

import jordan from "../fixtures/jordan-resume.json";
import { extractPdf } from "@/lib/ats/extract-pdf";
import { fixture } from "./fixtures";

const clone = (): Resume => structuredClone(jordan) as Resume;

describe("checkHonesty", async () => {
  const { sourceText } = await extractPdf(fixture("two-column.pdf"), "two-column.pdf");

  it("verifies a faithful extraction of the sample resume", () => {
    const report = checkHonesty(clone(), sourceText);
    expect(report.flags).toEqual([]);
    expect(report.totals.company).toEqual({ checked: 2, verified: 2 });
    expect(report.totals.skill).toEqual({ checked: 5, verified: 5 });
    expect(report.totals.number.checked).toBeGreaterThan(4);
  });

  it("flags an invented company, title, date and skill", () => {
    const resume = clone();
    resume.experience.push({
      title: "Principal Engineer",
      company: "Initech",
      location: "",
      start: "2012",
      end: "2014",
      bullets: [],
    });
    resume.skills[0].items.push("Kubernetes");
    const flags = checkHonesty(resume, sourceText).flags.map((f) => [f.path, f.kind]);
    expect(flags).toEqual([
      ["experience.2.company", "company"],
      ["experience.2.title", "title"],
      ["experience.2.end", "date"],
      ["skills.0.items.5", "skill"],
    ]);
  });

  it("flags inflated numbers in bullets", () => {
    const resume = clone();
    resume.experience[0].bullets[0] =
      "Led the rebuild of the patient portal, cutting load time by 75%.";
    const [flag] = checkHonesty(resume, sourceText).flags;
    expect(flag).toMatchObject({ path: "experience.0.bullets.0", kind: "number", value: "75%" });
  });

  it("ignores formatting differences in dashes, case and punctuation", () => {
    const resume = clone();
    resume.experience[0].company = "brightline health";
    resume.education[0].degree = "BS Computer Science";
    expect(checkHonesty(resume, sourceText).flags).toEqual([]);
  });

  it("matches short skills as whole words only", () => {
    const resume = clone();
    resume.skills[0].items = ["Go"];
    // "Go" only appears inside other words in the sample ("Oregon", "good"), so it is flagged.
    expect(checkHonesty(resume, sourceText).flags.map((f) => f.value)).toEqual(["Go"]);
  });
});
