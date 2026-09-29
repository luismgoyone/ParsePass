import type { AtsLine } from "@/lib/ats/types";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Does the text a parser extracts from the export match what we meant to write?
 * Lines may wrap differently, so compare the whole text with whitespace collapsed, and report
 * which expected lines are missing when it doesn't match.
 */
export function verifyExport(
  expected: string,
  extracted: AtsLine[],
): { match: boolean; missing: string[] } {
  const got = norm(extracted.map((l) => l.text).join(" "));
  if (norm(expected) === got) return { match: true, missing: [] };
  const missing = expected
    .split("\n")
    .map(norm)
    .filter((line) => line && !got.includes(line));
  return { match: false, missing };
}
