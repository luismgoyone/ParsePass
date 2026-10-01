import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { BULLET, displayText, type Block } from "@/lib/resume/template";

// Hyphenation would split words with "-" when wrapping, changing the text an ATS reads.
Font.registerHyphenationCallback((word) => [word]);

// Helvetica is one of the PDF standard fonts (metrically the same as Arial): nothing to embed,
// and every parser maps it to real, selectable text.
/**
 * "standard" is 10 pt, the smallest size the ATS rules call for. "compact" (9.5 pt, tighter
 * spacing) is only used when standard runs past one page.
 */
export type Density = "standard" | "compact";

const styles = (d: Density) =>
  StyleSheet.create({
    page: {
      fontFamily: "Helvetica",
      // 0.5" top/bottom, 0.6" sides.
      fontSize: d === "compact" ? 9.5 : 10,
      lineHeight: d === "compact" ? 1.15 : 1.25,
      paddingVertical: d === "compact" ? 30 : 36,
      paddingHorizontal: d === "compact" ? 38 : 43,
      color: "#111111",
    },
    name: { fontFamily: "Helvetica-Bold", fontSize: 16, lineHeight: 1.2, marginBottom: 2 },
    contact: { marginTop: 1 },
    heading: {
      fontFamily: "Helvetica-Bold",
      fontSize: 10.5,
      marginTop: d === "compact" ? 6 : 8,
      marginBottom: d === "compact" ? 2 : 3,
      paddingBottom: 1.5,
      borderBottomWidth: 0.75,
      borderBottomColor: "#111111",
    },
    title: { fontFamily: "Helvetica-Bold", marginTop: d === "compact" ? 3 : 4 },
    titleMeta: { fontFamily: "Helvetica" },
    line: {},
    paragraph: {},
    bulletRow: { flexDirection: "row", marginTop: d === "compact" ? 0.5 : 1 },
    bulletMark: { width: 10 },
    bulletText: { flex: 1 },
  });

/** The ATS template as a PDF: one column, real text, no header, footer, tables or graphics. */
export function ResumePdf({
  blocks,
  title,
  density = "standard",
}: {
  blocks: Block[];
  title: string;
  density?: Density;
}) {
  const s = styles(density);
  return (
    <Document
      title={title}
      author={blocks.find((b) => b.kind === "name")?.text}
      creator="ParsePass"
      producer="ParsePass"
    >
      <Page size="LETTER" style={s.page}>
        {blocks.map((block, i) =>
          block.kind === "bullet" ? (
            <View key={i} style={s.bulletRow} wrap={false}>
              <Text style={s.bulletMark}>{BULLET}</Text>
              <Text style={s.bulletText}>{block.text}</Text>
            </View>
          ) : block.kind === "title" && block.meta ? (
            <Text key={i} style={s.title}>
              {block.text}
              <Text style={s.titleMeta}>{displayText(block).slice(block.text.length)}</Text>
            </Text>
          ) : (
            <Text
              key={i}
              style={s[block.kind]}
              minPresenceAhead={block.kind === "heading" ? 40 : 0}
            >
              {displayText(block)}
            </Text>
          ),
        )}
      </Page>
    </Document>
  );
}
