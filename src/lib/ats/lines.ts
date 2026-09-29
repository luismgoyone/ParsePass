import type { AtsLine, Segment, TextItem } from "./types";

/** Horizontal gap (in points) that splits a line into separate segments. */
const SEGMENT_GAP = 14;

/**
 * Rebuild a page's text the way a naive parser reads it: group items that share a baseline
 * into one line, top to bottom, then read each line left to right. On a two-column page this
 * interleaves the columns, which is exactly the failure we want to show.
 */
export function linesFromItems(items: TextItem[], page: number): AtsLine[] {
  const visible = items.filter((it) => it.str.trim().length > 0);
  const sorted = [...visible].sort((a, b) => a.y - b.y || a.x - b.x);

  const rows: TextItem[][] = [];
  for (const item of sorted) {
    const row = rows.at(-1);
    const tolerance = Math.max(
      2,
      Math.min(item.fontSize, row?.[0].fontSize ?? item.fontSize) * 0.45,
    );
    if (row && Math.abs(row[0].y - item.y) <= tolerance) row.push(item);
    else rows.push([item]);
  }

  return rows.map((row) => {
    const ordered = [...row].sort((a, b) => a.x - b.x);
    const segments: Segment[] = [];
    for (const item of ordered) {
      const last = segments.at(-1);
      const gap = last ? item.x - last.right : Infinity;
      if (last && gap < SEGMENT_GAP) {
        last.text = joinRuns(last.text, item.str, gap);
        last.right = Math.max(last.right, item.x + item.width);
      } else {
        segments.push({ text: item.str, x: item.x, right: item.x + item.width });
      }
    }
    for (const s of segments) s.text = s.text.replace(/\s+/g, " ").trim();
    return {
      text: segments.map((s) => s.text).join(" "),
      page,
      y: row[0].y,
      segments,
    };
  });
}

function joinRuns(left: string, right: string, gap: number): string {
  if (left.endsWith(" ") || right.startsWith(" ")) return left + right;
  // Runs that touch are one word split by a font change; a visible gap is a space.
  return gap > 1 ? `${left} ${right}` : left + right;
}

/** Lines from plain text (DOCX raw text or pasted text). */
export function linesFromText(text: string): AtsLine[] {
  return text
    .split(/\r?\n/)
    .map((raw) => raw.replace(/\t+/g, "  ").replace(/[  ]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ text: line, page: 1, segments: [{ text: line, x: 0, right: 0 }] }));
}

export function atsText(lines: AtsLine[]): string {
  const out: string[] = [];
  lines.forEach((line, i) => {
    if (i > 0 && line.page !== lines[i - 1].page) out.push("");
    out.push(line.text);
  });
  return out.join("\n");
}
