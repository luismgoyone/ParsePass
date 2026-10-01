import { describe, expect, it } from "vitest";

import { matchKeywords } from "@/lib/jobs/match";
import type { Keyword } from "@/lib/jobs/schema";
import type { Resume } from "@/lib/resume/schema";

import jordan from "../fixtures/jordan-resume.json";

const resume = jordan as Resume;
const kw = (
  term: string,
  importance: Keyword["importance"] = "required",
  aliases: string[] = [],
): Keyword => ({
  term,
  aliases,
  kind: "skill",
  importance,
});

describe("matchKeywords", () => {
  it("finds terms anywhere on the resume, ignoring case and punctuation", () => {
    const m = matchKeywords(
      [kw("typescript"), kw("NextJS"), kw("Node.js"), kw("postgresql")],
      resume,
    );
    expect(m.missing).toEqual([]);
  });

  it("matches aliases and simple plurals", () => {
    const m = matchKeywords(
      [kw("Postgres", "required", ["PostgreSQL"]), kw("Billing APIs")],
      resume,
    );
    expect(m.found.map((k) => k.term)).toEqual(["Postgres", "Billing APIs"]);
  });

  it("doesn't match part of a word", () => {
    // "Go" appears only inside other words ("Oregon").
    expect(matchKeywords([kw("Go")], resume).missing.map((k) => k.term)).toEqual(["Go"]);
  });

  it("scores required terms double", () => {
    const m = matchKeywords(
      [kw("TypeScript"), kw("GraphQL"), kw("AWS", "preferred"), kw("Kubernetes", "preferred")],
      resume,
    );
    expect(m.required).toEqual({ found: 1, total: 2 });
    expect(m.preferred).toEqual({ found: 1, total: 2 });
    expect(m.score).toBe(50); // (1×2 + 1) / (2×2 + 2)
  });

  it("updates when the resume changes", () => {
    const edited = structuredClone(resume);
    edited.skills[0].items.push("GraphQL");
    expect(matchKeywords([kw("GraphQL")], edited).score).toBe(100);
  });
});
