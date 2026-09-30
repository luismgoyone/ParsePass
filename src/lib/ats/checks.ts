import { findDates, type DateFormat } from "./dates";
import { classifyHeading, looksLikeHeading, SECTION_LABELS, type SectionId } from "./sections";
import type { AtsIssue, AtsLine, Diagnosis, ExtractedDoc, Severity } from "./types";

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/;
// Private-use glyphs (icon fonts) and pictographs (emoji, ✉ ☎). ©, ® and ™ are fine.
const ICON = /[-]|(?![©®™])\p{Extended_Pictographic}/u;
const ICON_FONT = /awesome|icon|material|symbol|wingding|dingbat|glyph/i;
const DATE_ONLY = /^[\sA-Za-z.,/–—-]*\d{2,4}[\sA-Za-z\d.,/–—-]*$/;

const PENALTY: Record<Severity, number> = { critical: 25, warning: 10, notice: 4 };
const ORDER: Record<Severity, number> = { critical: 0, warning: 1, notice: 2 };

/** Run every ATS rule against an extracted document. Pure: same input, same issues. */
export function diagnose(doc: ExtractedDoc): Diagnosis {
  const issues: AtsIssue[] = [];
  const visibleChars = doc.lines.reduce((n, l) => n + l.text.replace(/\s/g, "").length, 0);

  if (doc.kind === "pdf" && visibleChars < 80) {
    issues.push({
      rule: "TXT-01",
      severity: "critical",
      title: "No selectable text",
      detail:
        "This PDF is an image or scan. An ATS reads text, not pictures, so it sees an empty resume. Export it from the original editor, or paste the text instead.",
      impact: "Empty profile",
      lines: [],
    });
    return { issues, score: 0 };
  }

  checkColumns(doc, issues);
  checkTables(doc, issues);
  checkGraphics(doc, issues);
  checkHeaderFooter(doc, issues);
  checkContact(doc, issues);
  checkIcons(doc, issues);
  checkSections(doc, issues);
  checkDates(doc, issues);
  checkLinks(doc, issues);

  return finish(issues);
}

function finish(issues: AtsIssue[]): Diagnosis {
  issues.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const score = Math.max(0, 100 - issues.reduce((n, i) => n + PENALTY[i.severity], 0));
  return { issues, score };
}

/** Where a second text column starts on a PDF page, if the page has one. */
export function detectColumnStart(lines: AtsLine[], pageWidth: number): number | null {
  const starts: number[] = [];
  for (const line of lines) {
    line.segments.forEach((seg, i) => {
      if (seg.x < pageWidth * 0.2 || seg.x > pageWidth * 0.8) return;
      if (i === 0 && line.segments.length === 1 && seg.text.length < 3) return;
      // Right-aligned dates ("2021 – Present") sit at the same x but aren't a column.
      if (DATE_ONLY.test(seg.text) && seg.text.length < 30) return;
      starts.push(seg.x);
    });
  }
  if (starts.length === 0) return null;

  starts.sort((a, b) => a - b);
  let best = { x: 0, count: 0 };
  for (let i = 0; i < starts.length; i++) {
    let j = i;
    while (j < starts.length && starts[j] - starts[i] <= 4) j++;
    if (j - i > best.count) best = { x: starts[i], count: j - i };
  }
  const threshold = Math.max(4, Math.ceil(lines.length * 0.2));
  if (best.count < threshold) return null;

  // It only scrambles the text if some lines hold both columns.
  const shared = lines.filter((l) => spansColumns(l, best.x)).length;
  return shared >= 2 ? best.x : null;
}

function spansColumns(line: AtsLine, columnX: number): boolean {
  return (
    line.segments.some((s) => s.right <= columnX + 2) &&
    line.segments.some((s) => s.x >= columnX - 6 && !(DATE_ONLY.test(s.text) && s.text.length < 30))
  );
}

function checkColumns(doc: ExtractedDoc, issues: AtsIssue[]) {
  if (doc.kind === "docx" && doc.docx && doc.docx.columns > 1) {
    issues.push({
      rule: "LAY-01",
      severity: "critical",
      title: `${doc.docx.columns}-column layout`,
      detail:
        "The document uses newspaper-style columns. Many parsers read straight across the page, mixing text from both columns into the same lines.",
      impact: "Scrambled lines",
      lines: [],
    });
    return;
  }
  if (doc.kind !== "pdf") return;

  for (let p = 0; p < doc.pages.length; p++) {
    const pageLines = doc.lines.map((l, i) => ({ l, i })).filter(({ l }) => l.page === p + 1);
    const columnX = detectColumnStart(
      pageLines.map(({ l }) => l),
      doc.pages[p].width,
    );
    if (columnX === null) continue;
    const merged = pageLines.filter(({ l }) => spansColumns(l, columnX)).map(({ i }) => i);
    issues.push({
      rule: "LAY-01",
      severity: "critical",
      title: "2-column layout",
      detail: `Text from the left and right columns lands on the same lines when read left to right. ${merged.length} line${merged.length === 1 ? "" : "s"} on page ${p + 1} mix both columns, so sections and job titles get merged.`,
      impact: "Scrambled lines",
      lines: merged,
      columnX,
    });
    return;
  }
}

/** ATS lines whose text came from inside a DOCX table or text box. */
function boxedLines(doc: ExtractedDoc): number[] {
  const boxed = new Set(doc.docx?.boxedText.map((t) => t.replace(/\s+/g, " ").trim()));
  return doc.lines.flatMap((l, i) => (boxed.has(l.text) ? [i] : []));
}

function checkTables(doc: ExtractedDoc, issues: AtsIssue[]) {
  if (doc.docx && doc.docx.tables > 0) {
    issues.push({
      rule: "LAY-02",
      severity: "critical",
      title:
        doc.docx.tables === 1
          ? "Content inside a table"
          : `Content inside ${doc.docx.tables} tables`,
      detail:
        "Tables are read cell by cell, often out of order or skipped entirely. Skills and dates kept in a table are the most common casualties.",
      impact: "Dropped content",
      lines: boxedLines(doc),
    });
    return;
  }
  if (doc.kind !== "pdf" || issues.some((i) => i.rule === "LAY-01")) return;
  const grid = doc.lines.map((l, i) => ({ l, i })).filter(({ l }) => l.segments.length >= 3);
  if (grid.length >= 3) {
    issues.push({
      rule: "LAY-02",
      severity: "warning",
      title: "Table-like layout",
      detail:
        "Several lines hold three or more separate blocks of text side by side, like a table. Parsers often join these cells into one run-on line.",
      impact: "Merged cells",
      lines: grid.map(({ i }) => i),
    });
  }
}

function checkGraphics(doc: ExtractedDoc, issues: AtsIssue[]) {
  const d = doc.docx;
  if (!d || (d.textBoxes === 0 && d.images === 0)) return;
  const parts = [
    d.textBoxes > 0 && `${d.textBoxes} text box${d.textBoxes === 1 ? "" : "es"}`,
    d.images > 0 && `${d.images} image${d.images === 1 ? "" : "s"}`,
  ].filter(Boolean);
  issues.push({
    rule: "LAY-03",
    severity: d.textBoxes > 0 ? "critical" : "warning",
    title: "Text boxes or graphics",
    detail: `Found ${parts.join(" and ")}. Text inside text boxes is often skipped by parsers, and images carry no readable text.`,
    impact: "Dropped content",
    lines: d.tables > 0 ? [] : boxedLines(doc),
  });
}

function checkHeaderFooter(doc: ExtractedDoc, issues: AtsIssue[]) {
  let text = "";
  if (doc.docx) text = [doc.docx.headerText, doc.docx.footerText].filter(Boolean).join("\n");
  else if (doc.kind === "pdf" && doc.pageCount > 1) text = repeatedEdgeLines(doc).join("\n");
  if (!text.trim()) return;

  const hasContact = EMAIL.test(text) || PHONE.test(text) || /linkedin|github|https?:/i.test(text);
  issues.push({
    rule: "HDR-01",
    severity: hasContact ? "warning" : "notice",
    title: hasContact ? "Contact details in the page header" : "Text in the page header or footer",
    detail: hasContact
      ? "Your email, phone or links sit in the page header or footer. Many ATS skip those areas, so recruiters can't reach you. Move them into the body."
      : "Some text sits in the page header or footer, which many ATS skip.",
    impact: hasContact ? "Missing contact info" : "Skipped text",
    lines: [],
  });
}

/** Lines that repeat at the very top or bottom of every page of a multi-page PDF. */
function repeatedEdgeLines(doc: ExtractedDoc): string[] {
  const edge = (l: AtsLine) => {
    const h = doc.pages[l.page - 1]?.height ?? 792;
    return l.y !== undefined && (l.y < h * 0.07 || l.y > h * 0.93);
  };
  const counts = new Map<string, Set<number>>();
  for (const l of doc.lines.filter(edge)) {
    const key = l.text.replace(/\d+/g, "#");
    counts.set(key, (counts.get(key) ?? new Set()).add(l.page));
  }
  return [...counts.entries()].filter(([, pages]) => pages.size === doc.pageCount).map(([t]) => t);
}

function checkContact(doc: ExtractedDoc, issues: AtsIssue[]) {
  const body = doc.lines.map((l) => l.text).join("\n");
  if (EMAIL.test(body)) return;
  if (issues.some((i) => i.rule === "HDR-01" && EMAIL.test(doc.docx?.headerText ?? ""))) return;
  issues.push({
    rule: "CON-01",
    severity: "warning",
    title: "No email address found",
    detail:
      "The ATS view doesn't contain an email address, so your profile would have no way to contact you.",
    impact: "Missing contact info",
    lines: [],
  });
}

function checkIcons(doc: ExtractedDoc, issues: AtsIssue[]) {
  const hits = doc.lines.map((l, i) => ({ l, i })).filter(({ l }) => ICON.test(l.text));
  const iconFonts = doc.fonts.filter((f) => ICON_FONT.test(f));
  if (hits.length === 0 && iconFonts.length === 0) return;
  issues.push({
    rule: "ICO-01",
    severity: "warning",
    title: "Icons or emoji",
    detail:
      "Icons and emoji come through as garbage characters or nothing at all. Use words (“Email:”, “Phone:”) and plain round bullets instead.",
    impact: "Garbled characters",
    lines: hits.map(({ i }) => i),
  });
}

function headingCandidates(doc: ExtractedDoc) {
  const out: { text: string; line: number }[] = [];
  doc.lines.forEach((l, i) => {
    for (const seg of l.segments)
      if (looksLikeHeading(seg.text)) out.push({ text: seg.text, line: i });
    if (l.segments.length > 1 && looksLikeHeading(l.text)) out.push({ text: l.text, line: i });
  });
  return out;
}

function checkSections(doc: ExtractedDoc, issues: AtsIssue[]) {
  const found = new Map<SectionId, boolean>();
  const renames: { text: string; section: SectionId; line: number }[] = [];
  for (const c of headingCandidates(doc)) {
    const match = classifyHeading(c.text);
    if (!match) continue;
    found.set(match.section, found.get(match.section) || match.standard);
    if (!match.standard)
      renames.push({ text: c.text.replace(/:$/, ""), section: match.section, line: c.line });
  }

  const required: SectionId[] = ["experience", "education", "skills"];
  const missing = required.filter((s) => !found.has(s));
  if (missing.length > 0) {
    const names = missing.map((s) => SECTION_LABELS[s]);
    issues.push({
      rule: "SEC-01",
      severity: "warning",
      title: `Missing section${missing.length === 1 ? "" : "s"}: ${names.join(", ")}`,
      detail: `No heading was found for ${names.join(", ")}. An ATS files your content by heading; without one, it may drop the content or put it in the wrong field.`,
      impact: "Unmapped content",
      lines: [],
    });
  }
  if (renames.length > 0) {
    issues.push({
      rule: "SEC-02",
      severity: "notice",
      title: "Non-standard section names",
      detail: `${renames.map((r) => `“${r.text}” → “${SECTION_LABELS[r.section]}”`).join(", ")}. Creative headings may not map to the right ATS field.`,
      impact: "Unmapped headings",
      lines: [...new Set(renames.map((r) => r.line))],
    });
  }
}

function checkDates(doc: ExtractedDoc, issues: AtsIssue[]) {
  const byFormat = new Map<DateFormat, { examples: Set<string>; lines: Set<number> }>();
  doc.lines.forEach((l, i) => {
    // Year-only ranges ("2012 – 2016") are fine next to month dates: often only the year is known.
    for (const d of findDates(l.text).filter((d) => d.format !== "YYYY")) {
      const entry = byFormat.get(d.format) ?? { examples: new Set(), lines: new Set() };
      entry.examples.add(d.text);
      entry.lines.add(i);
      byFormat.set(d.format, entry);
    }
  });
  const ambiguous = byFormat.get("MM/YY");
  if (byFormat.size <= 1 && !ambiguous) return;

  const formats = [...byFormat.entries()].sort((a, b) => b[1].lines.size - a[1].lines.size);
  const [, dominant] = formats[0];
  const flagged = formats.slice(1).flatMap(([, e]) => [...e.lines]);
  const examples = formats.map(([, e]) => `“${[...e.examples][0]}”`).join(", ");
  issues.push({
    rule: "DAT-01",
    severity: ambiguous ? "warning" : "notice",
    title: ambiguous ? "Ambiguous date format" : "Mixed date formats",
    detail: ambiguous
      ? `Dates like “${[...ambiguous.examples][0]}” can be read as a month or a year, so tenure gets miscalculated. Use one format, like “Mar 2025 – Present”.`
      : `Found ${formats.length} date formats (${examples}). Use one throughout, like “Mar 2025 – Present”.`,
    impact: "Ambiguous tenure",
    lines: ambiguous ? [...ambiguous.lines] : flagged.length > 0 ? flagged : [...dominant.lines],
  });
}

function checkLinks(doc: ExtractedDoc, issues: AtsIssue[]) {
  const hidden = doc.links.filter((link) => {
    const text = link.text.toLowerCase().replace(/\s/g, "");
    if (!text) return false;
    if (link.url.startsWith("mailto:")) return !text.includes(link.url.slice(7).toLowerCase());
    try {
      const url = new URL(link.url);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      return !text.includes(host);
    } catch {
      return false;
    }
  });
  if (hidden.length === 0) return;
  issues.push({
    rule: "LNK-01",
    severity: "notice",
    title: "Links hidden behind words",
    detail: `${hidden
      .slice(0, 3)
      .map((l) => `“${l.text}” → ${l.url.replace(/^mailto:/, "")}`)
      .join(", ")}. An ATS keeps the visible text and drops the link, so write URLs out in full.`,
    impact: "Lost links",
    lines: [],
  });
}
