import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { BULLET, displayText, type Block } from "@/lib/resume/template";

// Hyphenation would split words with "-" when wrapping, changing the text an ATS reads.
Font.registerHyphenationCallback((word) => [word]);

// Helvetica is one of the PDF standard fonts (metrically the same as Arial): nothing to embed,
// and every parser maps it to real, selectable text.
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10.5,
    lineHeight: 1.35,
    paddingVertical: 48,
    paddingHorizontal: 54,
    color: "#111111",
  },
  name: { fontFamily: "Helvetica-Bold", fontSize: 18, lineHeight: 1.2, marginBottom: 4 },
  contact: { fontSize: 10, marginTop: 2, marginBottom: 4 },
  heading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginTop: 12,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 0.75,
    borderBottomColor: "#111111",
  },
  title: { fontFamily: "Helvetica-Bold", marginTop: 6 },
  line: {},
  paragraph: {},
  bulletRow: { flexDirection: "row", marginTop: 1.5 },
  bulletMark: { width: 12 },
  bulletText: { flex: 1 },
});

/** The ATS template as a PDF: one column, real text, no header, footer, tables or graphics. */
export function ResumePdf({ blocks, title }: { blocks: Block[]; title: string }) {
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
