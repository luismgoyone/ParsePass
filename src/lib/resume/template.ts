import { formatRange, normalizeDate } from "@/lib/ats/dates";

import type { Resume } from "./schema";

/**
 * The one ATS template, as an ordered list of blocks. The PDF and DOCX renderers draw these
 * blocks and nothing else, so `expectedText(blocks)` is exactly what a parser should read back.
 *
 * Rules (docs/SPEC.md): single column, contact details in the body, standard headings, one date
 * format, job title on its own line with company and dates on the next, plain round bullets,
 * links in full.
 */
export type Block =
  | { kind: "name"; text: string }
  | { kind: "contact"; text: string }
  | { kind: "heading"; text: string }
  /** `meta` (a project link) is written on the same line, after the bold title. */
  | { kind: "title"; text: string; meta?: string }
  | { kind: "line"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet"; text: string };

export const BULLET = "•";
const SEPARATOR = " | ";

export function buildBlocks(resume: Resume): Block[] {
  const blocks: Block[] = [];
  const push = (kind: Block["kind"], text: string) => {
    const clean = tidy(text);
    if (clean) blocks.push({ kind, text: clean } as Block);
  };

  const c = resume.contact;
  push("name", c.name);
  if (c.headline) push("line", c.headline);
  push(
    "contact",
    [c.location, c.email, c.phone, ...c.links.map(fullLink)]
      .map(tidy)
      .filter(Boolean)
      .join(SEPARATOR),
  );

  if (tidy(resume.summary)) {
    push("heading", "Summary");
    push("paragraph", resume.summary);
  }

  const jobs = resume.experience.filter((j) => tidy(j.title) || tidy(j.company));
  if (jobs.length) {
    push("heading", "Experience");
    for (const job of jobs) {
      // Title on its own line; company, location and dates on the next, clearly delimited.
      push("title", job.title);
      push(
        "line",
        [job.company, job.location, formatRange(job.start, job.end)]
          .map(tidy)
          .filter(Boolean)
          .join(SEPARATOR),
      );
      job.bullets.forEach((b) => push("bullet", stripBullet(b)));
    }
  }

  const schools = resume.education.filter((e) => tidy(e.degree) || tidy(e.school));
  if (schools.length) {
    push("heading", "Education");
    for (const ed of schools) {
      push("title", ed.degree || ed.school);
      push(
        "line",
        [ed.degree ? ed.school : "", ed.location, formatRange(ed.start, ed.end)]
          .map(tidy)
          .filter(Boolean)
          .join(SEPARATOR),
      );
      ed.details.forEach((d) => push("bullet", stripBullet(d)));
    }
  }

  const groups = resume.skills.filter((g) => g.items.some((i) => tidy(i)));
  if (groups.length) {
    push("heading", "Skills");
    const single = groups.length === 1 && /^skills?$/i.test(tidy(groups[0].category));
    for (const g of groups) {
      const items = g.items.map(tidy).filter(Boolean).join(", ");
      push("line", single || !tidy(g.category) ? items : `${tidy(g.category)}: ${items}`);
    }
  }

  const projects = resume.projects.filter((p) => tidy(p.name));
  if (projects.length) {
    push("heading", "Projects");
    for (const p of projects) {
      // Name and link share a line to save space; the link is still written out in full.
      blocks.push({
        kind: "title",
        text: tidy(p.name),
        ...(tidy(p.link) ? { meta: fullLink(p.link) } : {}),
      });
      p.bullets.forEach((b) => push("bullet", stripBullet(b)));
    }
  }

  const certs = resume.certifications.filter((cert) => tidy(cert.name));
  if (certs.length) {
    push("heading", "Certifications");
    for (const cert of certs) {
      push(
        "line",
        [cert.name, cert.issuer, cert.date ? normalizeDate(cert.date) : ""]
          .map(tidy)
          .filter(Boolean)
          .join(SEPARATOR),
      );
    }
  }

  return blocks;
}

/** The text an ATS should extract from the exported file, one block per line. */
export function expectedText(blocks: Block[]): string {
  return blocks
    .map((b) => (b.kind === "bullet" ? `${BULLET} ${b.text}` : displayText(b)))
    .join("\n");
}

/** Headings render in capitals; everything else as the user wrote it. */
export function displayText(block: Block): string {
  if (block.kind === "heading") return block.text.toUpperCase();
  if (block.kind === "title" && block.meta) return `${block.text}${SEPARATOR}${block.meta}`;
  return block.text;
}

/** "Firstname_Lastname_Resume" from the contact name. */
export function exportBaseName(name: string): string {
  const parts = tidy(name)
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase());
  return parts.length ? `${parts.join("_")}_Resume` : "Resume";
}

function tidy(s: string): string {
  // Plain text only: drop icon-font glyphs and emoji, collapse whitespace.
  return s
    .replace(/[-]|(?![©®™])\p{Extended_Pictographic}️?/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripBullet(s: string): string {
  return s.replace(/^\s*[•●▪◦‣∙·*–-]\s*/, "");
}

/** Links written out in full, as the ATS rules require. */
export function fullLink(link: string): string {
  const l = tidy(link);
  if (!l || /^(https?:|mailto:)/i.test(l) || l.includes("@")) return l;
  return /^[\w-]+(\.[\w-]+)+(\/|$)/.test(l) ? `https://${l}` : l;
}
