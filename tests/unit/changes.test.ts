import { describe, expect, it } from "vitest";

import { diagnose } from "@/lib/ats/checks";
import { extractPdf } from "@/lib/ats/extract-pdf";
import { buildChangeLog, countEdits } from "@/lib/resume/changes";
import { checkHonesty } from "@/lib/resume/honesty";
import type { Resume } from "@/lib/resume/schema";

import jordan from "../fixtures/jordan-resume.json";
import { fixture } from "./fixtures";

describe("buildChangeLog", async () => {
  const doc = await extractPdf(fixture("two-column.pdf"), "two-column.pdf");
  const { issues } = diagnose(doc);
  const resume = jordan as Resume;

  it("explains every fix for the sample resume in plain language", () => {
    const log = buildChangeLog({
      issues,
      extracted: resume,
      resume,
      honesty: checkHonesty(resume, doc.sourceText),
    });
    expect(log.map((c) => c.title)).toEqual([
      "Converted the multi-column layout to a single column",
      "Renamed headings to standard names",
      "Wrote links out in full",
      "Normalized 1 date to “Mon YYYY”",
      "Applied the ATS template",
      "Kept your words",
    ]);
    expect(log[3].detail).toContain("“04/21” is now “Apr 2021”");
  });

  it("reports edits and anything not in the original", () => {
    const edited = structuredClone(resume);
    edited.skills[0].items.push("Kubernetes");
    edited.summary = "Engineer.";
    const log = buildChangeLog({
      issues: [],
      extracted: resume,
      resume: edited,
      honesty: checkHonesty(edited, doc.sourceText),
    });
    expect(log.find((c) => c.kind === "review")?.title).toBe("1 item not in your original");
    expect(log.find((c) => c.kind === "edit")?.title).toBe("You edited 2 fields");
  });
});

describe("countEdits", () => {
  it("counts changed, added and removed leaves", () => {
    expect(countEdits({ a: "x", b: ["1", "2"] }, { a: "y", b: ["1"] })).toBe(2);
    expect(countEdits({ a: [] }, { a: [{ x: "1", y: "" }] })).toBe(2);
    expect(countEdits(jordan, structuredClone(jordan))).toBe(0);
  });
});
