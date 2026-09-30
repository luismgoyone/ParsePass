import type { Resume } from "./schema";

export type HonestyKind =
  "company" | "title" | "date" | "school" | "degree" | "skill" | "number" | "contact";

export interface HonestyFlag {
  /** Path to the field, e.g. "experience.0.company". */
  path: string;
  kind: HonestyKind;
  value: string;
  message: string;
}

export interface HonestyReport {
  flags: HonestyFlag[];
  /** Checked vs. verified counts per kind, for the guardrails panel. */
  totals: Record<HonestyKind, { checked: number; verified: number }>;
}

/** Lowercase, unify dashes, quotes and whitespace so formatting differences don't matter. */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‐-―−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[•●▪◦·]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PRESENT = /^(present|current|now|today)$/i;
const NUMBER = /\$?\d[\d,.]*\s*(?:%|k\b|m\b|x\b|\+)?/gi;

/**
 * Check that every company, title, school, degree, date, skill and number in the structured
 * resume appears in the text the user gave us. Claude is told to copy only what's there; this
 * is the code that makes sure. Anything not found is flagged for the user, never silently kept.
 */
export function checkHonesty(resume: Resume, sourceText: string): HonestyReport {
  const source = normalizeForMatch(sourceText);
  const sourceNumbers = new Set([...source.matchAll(NUMBER)].map((m) => digits(m[0])));
  const flags: HonestyFlag[] = [];
  const totals = Object.fromEntries(
    (
      [
        "company",
        "title",
        "date",
        "school",
        "degree",
        "skill",
        "number",
        "contact",
      ] as HonestyKind[]
    ).map((k) => [k, { checked: 0, verified: 0 }]),
  ) as HonestyReport["totals"];

  const check = (
    kind: HonestyKind,
    path: string,
    value: string,
    found = contains(source, value),
  ) => {
    if (!value.trim()) return;
    totals[kind].checked++;
    if (found) totals[kind].verified++;
    else
      flags.push({
        path,
        kind,
        value,
        message: `“${value}” doesn't appear in your original resume.`,
      });
  };

  const checkDate = (path: string, value: string) => {
    if (PRESENT.test(value.trim())) {
      check("date", path, value, /\b(present|current|now|today)\b/.test(source));
    } else {
      check("date", path, value);
    }
  };

  const checkNumbers = (path: string, text: string) => {
    for (const m of text.matchAll(NUMBER)) {
      const n = digits(m[0]);
      if (!n || n.length < 1) continue;
      totals.number.checked++;
      if (sourceNumbers.has(n) || source.includes(n)) totals.number.verified++;
      else
        flags.push({
          path,
          kind: "number",
          value: m[0].trim(),
          message: `The number “${m[0].trim()}” isn't in your original resume.`,
        });
    }
  };

  const c = resume.contact;
  check("contact", "contact.email", c.email);
  check(
    "contact",
    "contact.phone",
    c.phone,
    !c.phone.trim() || source.replace(/\D/g, "").includes(c.phone.replace(/\D/g, "")),
  );

  resume.experience.forEach((job, i) => {
    check("company", `experience.${i}.company`, job.company);
    check("title", `experience.${i}.title`, job.title);
    checkDate(`experience.${i}.start`, job.start);
    checkDate(`experience.${i}.end`, job.end);
    job.bullets.forEach((b, j) => checkNumbers(`experience.${i}.bullets.${j}`, b));
  });
  resume.education.forEach((ed, i) => {
    check("school", `education.${i}.school`, ed.school);
    check("degree", `education.${i}.degree`, ed.degree);
    checkDate(`education.${i}.start`, ed.start);
    checkDate(`education.${i}.end`, ed.end);
  });
  resume.skills.forEach((group, i) =>
    group.items.forEach((skill, j) => check("skill", `skills.${i}.items.${j}`, skill)),
  );
  resume.certifications.forEach((cert, i) => checkDate(`certifications.${i}.date`, cert.date));
  checkNumbers("summary", resume.summary);

  return { flags, totals };
}

function contains(source: string, value: string): boolean {
  const v = normalizeForMatch(value).replace(/[.,;:]+$/, "");
  if (!v) return true;
  // Short values ("Go", "C", "AWS") must match a whole word, not part of one.
  if (v.length <= 3) return new RegExp(`(^|[^a-z0-9])${escapeRegExp(v)}($|[^a-z0-9])`).test(source);
  if (source.includes(v)) return true;
  // Tolerate punctuation and spacing differences ("React.js" vs "React js", "B.S." vs "BS").
  const loose = (s: string) => s.replace(/[^a-z0-9+#]+/g, "");
  return loose(source).includes(loose(v));
}

function digits(s: string): string {
  return s.replace(/[^\d.]/g, "").replace(/\.$/, "");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
