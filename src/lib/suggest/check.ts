import { normalizeForMatch } from "@/lib/resume/honesty";

const NUMBER = /\d[\d,.]*/g;
/** Words that name something: capitalized mid-sentence, or containing digits or . + # (Next.js, C++, S3). */
const NAMED = /\b[A-Za-z][\w.+#-]*[\w+#]|\b[A-Z]\w*/g;

export type SuggestionVerdict = { ok: true } | { ok: false; reason: string };

/**
 * A reworded bullet may only use facts the person already wrote. Rejects suggestions that add a
 * number not in the original bullet, or a named thing (tool, company, product) that appears
 * nowhere on the resume. Rewording, reordering and dropping words are fine.
 */
export function checkSuggestion(
  original: string,
  suggestion: string,
  resumeSource: string,
): SuggestionVerdict {
  const clean = suggestion.trim();
  if (!clean) return { ok: false, reason: "empty" };
  if (normalizeForMatch(clean) === normalizeForMatch(original))
    return { ok: false, reason: "unchanged" };

  const digits = (s: string) => s.replace(/[^\d.]/g, "").replace(/\.$/, "");
  const originalNumbers = new Set([...original.matchAll(NUMBER)].map((m) => digits(m[0])));
  for (const m of clean.matchAll(NUMBER)) {
    if (!originalNumbers.has(digits(m[0])))
      return { ok: false, reason: `adds the number “${m[0]}”` };
  }

  const known = normalizeForMatch(`${original}\n${resumeSource}`);
  for (const m of clean.matchAll(NAMED)) {
    const word = m[0];
    const named =
      /[\d.+#]/.test(word.slice(1)) ||
      (/^[A-Z]/.test(word) && m.index !== 0 && !startsSentence(clean, m.index ?? 0));
    if (!named) continue;
    if (!new RegExp(`(^|[^a-z0-9])${escape(normalizeForMatch(word))}($|[^a-z0-9])`).test(known)) {
      return { ok: false, reason: `adds “${word}”, which isn't on your resume` };
    }
  }
  return { ok: true };
}

function startsSentence(text: string, index: number): boolean {
  return /[.!?]\s*$/.test(text.slice(0, index));
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
