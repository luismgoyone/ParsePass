import { normalizeDate } from "@/lib/ats/dates";
import type { AtsIssue } from "@/lib/ats/types";

import type { HonestyReport } from "./honesty";
import type { Resume } from "./schema";
import { fullLink } from "./template";

export interface Change {
  kind: "fix" | "kept" | "edit" | "review";
  title: string;
  detail: string;
}

/** What each original issue became in the export, in plain language. */
const FIXES: Record<string, (issue: AtsIssue) => Omit<Change, "kind">> = {
  "LAY-01": () => ({
    title: "Converted the multi-column layout to a single column",
    detail: "Sections now read top to bottom, so a parser no longer mixes lines from both columns.",
  }),
  "LAY-02": () => ({
    title: "Took content out of tables",
    detail: "Skills and details that sat in table cells are now plain lines of text.",
  }),
  "LAY-03": () => ({
    title: "Removed text boxes and graphics",
    detail: "Text inside boxes is now regular body text; images carried no readable text.",
  }),
  "HDR-01": () => ({
    title: "Moved contact details from the page header into the body",
    detail:
      "Many ATS skip page headers and footers; your email and phone are now on the first lines.",
  }),
  "ICO-01": () => ({
    title: "Removed icons and emoji",
    detail: "They came through as garbage characters. Bullets are plain round bullets.",
  }),
  "SEC-02": (issue) => ({
    title: "Renamed headings to standard names",
    detail: issue.detail.split(". ")[0] + ".",
  }),
  "SEC-01": () => ({
    title: "Used standard section headings",
    detail:
      "Summary, Experience, Education, Skills, Projects and Certifications, so each part maps to the right ATS field.",
  }),
  "LNK-01": () => ({
    title: "Wrote links out in full",
    detail:
      "Links hidden behind words like “LinkedIn” are now full URLs that survive text extraction.",
  }),
  "CON-01": () => ({
    title: "Put contact details on their own line",
    detail:
      "Check that your email is in the contact section: the original had none an ATS could read.",
  }),
  "TXT-01": () => ({
    title: "Rebuilt the resume as real text",
    detail: "The original was an image. The export is selectable text that any parser can read.",
  }),
};

export function buildChangeLog({
  issues,
  extracted,
  resume,
  honesty,
  density = "standard",
}: {
  /** Which export layout was used ("compact" when 10 pt didn't fit on one page). */
  density?: "standard" | "compact";
  issues: AtsIssue[];
  extracted: Resume | null;
  resume: Resume;
  honesty: HonestyReport;
}): Change[] {
  const changes: Change[] = [];

  for (const issue of issues) {
    const fix = FIXES[issue.rule];
    if (fix) changes.push({ kind: "fix", ...fix(issue) });
  }

  const dates = [
    ...resume.experience.flatMap((j) => [j.start, j.end]),
    ...resume.education.flatMap((e) => [e.start, e.end]),
    ...resume.certifications.map((c) => c.date),
  ].filter((d) => d.trim());
  const reformatted = dates.filter((d) => normalizeDate(d) !== d.trim());
  if (reformatted.length > 0) {
    changes.push({
      kind: "fix",
      title: `Normalized ${reformatted.length} date${reformatted.length === 1 ? "" : "s"} to “Mon YYYY”`,
      detail: `For example “${reformatted[0].trim()}” is now “${normalizeDate(reformatted[0])}”. One format throughout, so tenure is calculated correctly.`,
    });
  }

  const expandedLinks = resume.contact.links.filter((l) => l.trim() && fullLink(l) !== l.trim());
  if (expandedLinks.length > 0 && !issues.some((i) => i.rule === "LNK-01")) {
    changes.push({
      kind: "fix",
      title: "Wrote links out in full",
      detail: `“${expandedLinks[0]}” is now “${fullLink(expandedLinks[0])}”.`,
    });
  }

  changes.push({
    kind: "fix",
    title: "Applied the ATS template",
    detail:
      "One column, Helvetica/Arial, job title on its own line with company and dates on the next, no header, footer or tables.",
  });
  if (density === "compact") {
    changes.push({
      kind: "fix",
      title: "Fitted to one page",
      detail:
        "At 10 pt it ran onto a second page, so it uses 9.5 pt text and slightly tighter spacing. Nothing was cut.",
    });
  }

  const checked = Object.values(honesty.totals).reduce((n, t) => n + t.checked, 0);
  if (honesty.flags.length === 0) {
    changes.push({
      kind: "kept",
      title: "Kept your words",
      detail: `All ${checked} companies, titles, dates, skills and numbers match your original resume. Nothing was invented.`,
    });
  } else {
    changes.push({
      kind: "review",
      title: `${honesty.flags.length} item${honesty.flags.length === 1 ? "" : "s"} not in your original`,
      detail: `${honesty.flags
        .slice(0, 3)
        .map((f) => `“${f.value}”`)
        .join(
          ", ",
        )}${honesty.flags.length > 3 ? " and more" : ""}. Make sure each is true before you send this.`,
    });
  }

  const edits = extracted ? countEdits(extracted, resume) : 0;
  if (edits > 0) {
    changes.push({
      kind: "edit",
      title: `You edited ${edits} field${edits === 1 ? "" : "s"}`,
      detail: "Your edits are in the export exactly as you typed them.",
    });
  }

  return changes;
}

/** Number of leaf values that differ between two resumes (added and removed entries count too). */
export function countEdits(a: unknown, b: unknown): number {
  if (Array.isArray(a) || Array.isArray(b)) {
    const x = Array.isArray(a) ? a : [];
    const y = Array.isArray(b) ? b : [];
    let n = 0;
    for (let i = 0; i < Math.max(x.length, y.length); i++) n += countEdits(x[i], y[i]);
    return n;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let n = 0;
    for (const k of keys)
      n += countEdits((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]);
    return n;
  }
  if (a === undefined && b === undefined) return 0;
  if (typeof a === "object" || typeof b === "object") return countEdits(a ?? {}, b ?? {}) || 1;
  return a === b ? 0 : 1;
}
