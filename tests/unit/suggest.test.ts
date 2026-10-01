import { describe, expect, it } from "vitest";

import { checkSuggestion } from "@/lib/suggest/check";
import { diffWords } from "@/lib/suggest/diff";

const SOURCE =
  "Skills: TypeScript, React, Next.js, PostgreSQL, AWS. Built a billing API with Figma designs.";
const ORIGINAL = "Led the rebuild of the patient portal in Next.js, cutting load time by 40%.";

describe("checkSuggestion", () => {
  it("accepts rewording that keeps the facts", () => {
    expect(
      checkSuggestion(
        ORIGINAL,
        "Rebuilt the patient portal in Next.js, cutting load time by 40%.",
        SOURCE,
      ),
    ).toEqual({ ok: true });
  });

  it("accepts terms that are elsewhere on the resume", () => {
    expect(
      checkSuggestion(
        ORIGINAL,
        "Rebuilt the React and Next.js patient portal, cutting load time by 40%.",
        SOURCE,
      ),
    ).toEqual({ ok: true });
  });

  it("rejects new numbers", () => {
    expect(
      checkSuggestion(
        ORIGINAL,
        "Rebuilt the patient portal in Next.js for 50,000 users, cutting load time by 40%.",
        SOURCE,
      ),
    ).toEqual({
      ok: false,
      reason: "adds the number “50,000”",
    });
  });

  it("rejects changed numbers", () => {
    expect(
      checkSuggestion(
        ORIGINAL,
        "Rebuilt the patient portal in Next.js, cutting load time by 60%.",
        SOURCE,
      ).ok,
    ).toBe(false);
  });

  it("rejects named tools or products that aren't on the resume", () => {
    expect(
      checkSuggestion(
        ORIGINAL,
        "Rebuilt the patient portal in Next.js on Kubernetes, cutting load time by 40%.",
        SOURCE,
      ),
    ).toEqual({
      ok: false,
      reason: "adds “Kubernetes”, which isn't on your resume",
    });
    expect(
      checkSuggestion(
        ORIGINAL,
        "Rebuilt the patient portal in Vue.js, cutting load time by 40%.",
        SOURCE,
      ).ok,
    ).toBe(false);
  });

  it("rejects suggestions that don't change anything", () => {
    expect(checkSuggestion(ORIGINAL, `  ${ORIGINAL}  `, SOURCE)).toEqual({
      ok: false,
      reason: "unchanged",
    });
  });
});

describe("diffWords", () => {
  it("marks removed and added words", () => {
    expect(diffWords("Led the rebuild of the portal", "Rebuilt the portal")).toEqual([
      { type: "removed", text: "Led the rebuild of" },
      { type: "added", text: "Rebuilt" },
      { type: "same", text: " the portal" },
    ]);
  });

  it("returns one unchanged part for identical text", () => {
    expect(diffWords("same text", "same text")).toEqual([{ type: "same", text: "same text" }]);
  });
});
