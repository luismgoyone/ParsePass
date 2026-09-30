import { strFromU8, unzipSync } from "fflate";
import mammoth from "mammoth";

import { linesFromText } from "./lines";
import type { DocxStructure, ExtractedDoc, HyperLink } from "./types";

/**
 * Extract a DOCX the way an ATS does: mammoth reads the document body (it skips page headers
 * and footers, like most parsers). The package XML is inspected separately for tables, text
 * boxes, images, columns and header text, which plain text extraction can't reveal.
 */
export async function extractDocx(
  data: ArrayBuffer | Uint8Array,
  fileName: string,
): Promise<ExtractedDoc> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

  // The browser build of mammoth reads `arrayBuffer`; the Node build reads `buffer`.
  const { value: body } = await mammoth.extractRawText({
    arrayBuffer,
    buffer: bytes,
  } as unknown as { arrayBuffer: ArrayBuffer });

  const files = unzipSync(bytes, {
    filter: (f) =>
      (f.name.startsWith("word/") && f.name.endsWith(".xml")) || f.name.endsWith(".rels"),
  });
  const read = (name: string) => (files[name] ? strFromU8(files[name]) : "");
  const documentXml = read("word/document.xml");
  const structure = inspectDocx(files, documentXml);
  const links = extractHyperlinks(documentXml, read("word/_rels/document.xml.rels"));

  const lines = linesFromText(body);
  const fonts = [
    ...new Set(
      [...read("word/fontTable.xml").matchAll(/<w:font w:name="([^"]+)"/g)].map((m) => m[1]),
    ),
  ];

  return {
    kind: "docx",
    fileName,
    pageCount: 1,
    pages: [],
    lines,
    sourceText: [structure.headerText, body.trim(), structure.footerText]
      .filter(Boolean)
      .join("\n\n"),
    links,
    fonts,
    docx: structure,
  };
}

function inspectDocx(files: Record<string, Uint8Array>, documentXml: string): DocxStructure {
  const count = (re: RegExp) => documentXml.match(re)?.length ?? 0;
  const partText = (prefix: string) =>
    Object.keys(files)
      .filter((name) => name.startsWith(`word/${prefix}`) && name.endsWith(".xml"))
      .sort()
      .map((name) => xmlText(strFromU8(files[name])))
      .filter(Boolean)
      .join("\n");

  const columnCounts = [...documentXml.matchAll(/<w:cols\b[^>]*\bw:num="(\d+)"/g)].map((m) =>
    Number(m[1]),
  );
  // Word writes each text box twice (DrawingML plus a VML fallback), so count one flavor.
  const textBoxes = Math.max(count(/<wps:txbx\b/g), count(/<v:textbox\b/g));

  return {
    tables: count(/<w:tbl>/g) + count(/<w:tbl\s/g),
    textBoxes,
    images: count(/<pic:pic\b/g),
    columns: Math.max(1, ...columnCounts),
    headerText: partText("header"),
    footerText: partText("footer"),
    boxedText: [
      ...documentXml.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:txbxContent>[\s\S]*?<\/w:txbxContent>/g),
    ].flatMap((m) => xmlText(m[0]).split("\n")),
  };
}

/** Text of a WordprocessingML part: one line per paragraph. */
export function xmlText(xml: string): string {
  return xml
    .split(/<\/w:p>/)
    .map((p) =>
      [...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>/g)]
        .map((m) => (m[0] === "<w:tab/>" ? " " : decodeXml(m[1])))
        .join("")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");
}

function extractHyperlinks(documentXml: string, relsXml: string): HyperLink[] {
  const targets = new Map<string, string>();
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = m[0];
    if (!/Type="[^"]*\/hyperlink"/.test(tag)) continue;
    const id = tag.match(/\bId="([^"]+)"/)?.[1];
    const target = tag.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) targets.set(id, decodeXml(target));
  }
  const links: HyperLink[] = [];
  for (const m of documentXml.matchAll(/<w:hyperlink\b([^>]*)>([\s\S]*?)<\/w:hyperlink>/g)) {
    const id = m[1].match(/r:id="([^"]+)"/)?.[1];
    const url = id && targets.get(id);
    if (url) links.push({ url, text: xmlText(`${m[2]}</w:p>`) });
  }
  return links;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
