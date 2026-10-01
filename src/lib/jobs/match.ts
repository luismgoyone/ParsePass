import type { Resume } from "@/lib/resume/schema";

import type { Keyword } from "./schema";

export interface KeywordMatch {
  found: Keyword[];
  missing: Keyword[];
  required: { found: number; total: number };
  preferred: { found: number; total: number };
  /** 0–100. Required terms count double. */
  score: number;
}

/** Every piece of text on the resume, as one searchable string. */
export function resumeText(resume: Resume): string {
  const { contact: c } = resume;
  return [
    c.name,
    c.headline,
    resume.summary,
    ...resume.experience.flatMap((j) => [j.title, j.company, ...j.bullets]),
    ...resume.education.flatMap((e) => [e.degree, e.school, ...e.details]),
    ...resume.skills.flatMap((g) => [g.category, ...g.items]),
    ...resume.projects.flatMap((p) => [p.name, ...p.bullets]),
    ...resume.certifications.flatMap((cert) => [cert.name, cert.issuer]),
  ].join("\n");
}

/** Lowercase tokens; keeps + and # so "C++" and "C#" survive. */
function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/** "apis" → "api", "services" → "service"; leaves "aws", "class", "js" alone. */
function singular(word: string): string {
  return word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
}

/** A phrase as spaced and joined forms ("node js", "nodejs"), plus the same with a singular last word. */
function forms(words: string[]): string[] {
  const out = [words.join(" "), words.join("")];
  const last = singular(words[words.length - 1]);
  if (last !== words[words.length - 1]) {
    const alt = [...words.slice(0, -1), last];
    out.push(alt.join(" "), alt.join(""));
  }
  return out;
}

/** Every 1–4 word phrase in the text, in all its forms. */
function phraseIndex(text: string): Set<string> {
  const t = tokens(text);
  const index = new Set<string>();
  for (let i = 0; i < t.length; i++) {
    for (let n = 1; n <= 4 && i + n <= t.length; n++)
      forms(t.slice(i, i + n)).forEach((f) => index.add(f));
  }
  return index;
}

function matches(index: Set<string>, term: string): boolean {
  const t = tokens(term);
  return t.length > 0 && forms(t).some((f) => index.has(f));
}

/**
 * Which of the job's keywords the resume already contains. Deterministic: the same resume and
 * keyword list always give the same score, so it can update live as the user edits.
 */
export function matchKeywords(keywords: Keyword[], resume: Resume): KeywordMatch {
  const index = phraseIndex(resumeText(resume));
  const found: Keyword[] = [];
  const missing: Keyword[] = [];
  for (const k of keywords) {
    if ([k.term, ...k.aliases].some((t) => matches(index, t))) found.push(k);
    else missing.push(k);
  }
  const count = (list: Keyword[], importance: Keyword["importance"]) =>
    list.filter((k) => k.importance === importance).length;
  const required = { found: count(found, "required"), total: count(keywords, "required") };
  const preferred = { found: count(found, "preferred"), total: count(keywords, "preferred") };
  const weight = required.total * 2 + preferred.total;
  const score =
    weight === 0 ? 0 : Math.round(((required.found * 2 + preferred.found) / weight) * 100);
  return { found, missing, required, preferred, score };
}
