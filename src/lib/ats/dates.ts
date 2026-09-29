export type DateFormat = "Mon YYYY" | "Month YYYY" | "MM/YYYY" | "MM/YY" | "YYYY-MM" | "YYYY";

const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec";
const FULL_MONTHS =
  "january|february|march|april|may|june|july|august|september|october|november|december";

const PATTERNS: { format: DateFormat; re: RegExp }[] = [
  { format: "Month YYYY", re: new RegExp(`\\b(?:${FULL_MONTHS})\\s+(?:19|20)\\d{2}\\b`, "gi") },
  { format: "Mon YYYY", re: new RegExp(`\\b(?:${MONTHS})\\.?\\s+(?:19|20)\\d{2}\\b`, "gi") },
  { format: "MM/YYYY", re: /\b(?:0?[1-9]|1[0-2])\/(?:19|20)\d{2}\b/g },
  { format: "YYYY-MM", re: /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])\b/g },
  { format: "MM/YY", re: /\b(?:0?[1-9]|1[0-2])\/\d{2}(?![\d/])/g },
  // Year-only ranges such as "2018 – 2021" or "2019 - Present".
  {
    format: "YYYY",
    re: /\b(?:19|20)\d{2}(?=\s*[–—-]\s*(?:(?:19|20)\d{2}|present|current|now)\b)/gi,
  },
];

/** Every date in a line, with its format. Earlier patterns win where matches overlap. */
export function findDates(line: string): { text: string; format: DateFormat }[] {
  const taken: [number, number][] = [];
  const found: { text: string; format: DateFormat; index: number }[] = [];
  for (const { format, re } of PATTERNS) {
    for (const m of line.matchAll(re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (taken.some(([s, e]) => start < e && end > s)) continue;
      taken.push([start, end]);
      found.push({ text: m[0], format, index: start });
    }
  }
  return found.sort((a, b) => a.index - b.index).map(({ text, format }) => ({ text, format }));
}

const MONTH_INDEX: Record<string, number> = Object.fromEntries(
  MONTHS.split("|")
    .filter((m) => m !== "sept")
    .map((m, i) => [m, i]),
);
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Normalize one date to the ATS format "Mon YYYY" (or "YYYY" when only the year is known).
 * Returns the input unchanged when it can't be parsed.
 */
export function normalizeDate(input: string): string {
  const s = input.trim();
  if (/^(present|current|now)$/i.test(s)) return "Present";
  let m = s.match(/^([a-z]{3,9})\.?\s+((?:19|20)\d{2})$/i);
  if (m) {
    const idx = MONTH_INDEX[m[1].slice(0, 3).toLowerCase()];
    return idx === undefined ? s : `${SHORT[idx]} ${m[2]}`;
  }
  m = s.match(/^(\d{1,2})[/.-]((?:19|20)\d{2})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12) return `${SHORT[+m[1] - 1]} ${m[2]}`;
  m = s.match(/^((?:19|20)\d{2})-(\d{2})$/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${SHORT[+m[2] - 1]} ${m[1]}`;
  m = s.match(/^(\d{1,2})\/(\d{2})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12) return `${SHORT[+m[1] - 1]} 20${m[2]}`;
  if (/^(?:19|20)\d{2}$/.test(s)) return s;
  return s;
}

/** "Mar 2025 – Present". Either side may be empty. */
export function formatRange(start: string, end: string): string {
  const a = start.trim() ? normalizeDate(start) : "";
  const b = end.trim() ? normalizeDate(end) : "";
  if (a && b) return `${a} – ${b}`;
  return a || b;
}
