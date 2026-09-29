/**
 * Generate the resume fixtures used by unit and e2e tests, plus the "Try a sample" resume.
 * Everything here is a fictional person. Re-run after changing: `pnpm fixtures`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  Document,
  Link,
  Page,
  Rect,
  renderToBuffer,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  Document as DocxDocument,
  ExternalHyperlink,
  Header,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const FIXTURES = join(process.cwd(), "tests/fixtures");
const SAMPLES = join(process.cwd(), "public/samples");

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 36, color: "#18181b" },
  name: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  role: { fontSize: 11, color: "#4f46e5", marginTop: 2 },
  contact: { fontSize: 9, color: "#52525b", textAlign: "right" },
  row: { flexDirection: "row", gap: 18, marginTop: 16 },
  side: { width: 150, backgroundColor: "#f4f4f5", padding: 10 },
  main: { flex: 1 },
  h: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    marginTop: 10,
    letterSpacing: 1,
  },
  jobHead: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#52525b" },
  bullet: { marginLeft: 8, marginTop: 2 },
});

/** A designed two-column resume: the classic ATS failure. */
function TwoColumnResume() {
  return (
    <Document title="Jordan Rivera Resume">
      <Page size="LETTER" style={s.page}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={s.name}>JORDAN RIVERA</Text>
            <Text style={s.role}>Senior Full-Stack Engineer</Text>
          </View>
          <View>
            <Text style={s.contact}>jordan.rivera@example.com</Text>
            <Text style={s.contact}>+1 (415) 555-0142</Text>
            <Link src="https://www.linkedin.com/in/jordan-rivera-dev" style={s.contact}>
              LinkedIn
            </Link>
          </View>
        </View>
        <View style={s.row}>
          <View style={s.side}>
            <Text style={s.h}>MY TOOLBOX</Text>
            <Text>TypeScript</Text>
            <Text>React and Next.js</Text>
            <Text>Node.js</Text>
            <Text>PostgreSQL</Text>
            <Text>AWS</Text>
            <Text style={s.h}>EDUCATION</Text>
            <Text style={s.bold}>B.S. Computer Science</Text>
            <Text style={s.muted}>University of Oregon</Text>
            <Text style={s.muted}>2012 – 2016</Text>
            <Text style={s.h}>CERTIFICATIONS</Text>
            <Text>AWS Certified Developer</Text>
          </View>
          <View style={s.main}>
            <Text style={s.h}>PROFILE</Text>
            <Text>
              Full-stack engineer with 8 years of experience building web products used by millions
              of people. I care about fast pages, clear code and teams that ship.
            </Text>
            <Text style={s.h}>MY JOURNEY</Text>
            <View style={s.jobHead}>
              <Text style={s.bold}>Senior Software Engineer</Text>
              <Text style={s.muted}>04/21 – Present</Text>
            </View>
            <Text style={s.muted}>Brightline Health, Portland, OR</Text>
            <Text style={s.bullet}>
              • Led the rebuild of the patient portal in Next.js, cutting load time by 40%.
            </Text>
            <Text style={s.bullet}>
              • Designed a billing API that processes 2 million claims a month.
            </Text>
            <Text style={s.bullet}>
              • Mentored 4 engineers through their first year on the team.
            </Text>
            <View style={s.jobHead}>
              <Text style={s.bold}>Software Engineer</Text>
              <Text style={s.muted}>Jun 2016 – Mar 2021</Text>
            </View>
            <Text style={s.muted}>Cascade Commerce, Seattle, WA</Text>
            <Text style={s.bullet}>
              • Built the checkout flow in React, raising conversion by 12%.
            </Text>
            <Text style={s.bullet}>
              • Moved nightly batch jobs to AWS Lambda, saving $30,000 a year.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

/** The same person, laid out the way an ATS wants. */
function CleanResume() {
  return (
    <Document title="Jordan Rivera Resume">
      <Page size="LETTER" style={s.page}>
        <Text style={s.name}>Jordan Rivera</Text>
        <Text style={s.muted}>
          Portland, OR | jordan.rivera@example.com | +1 (415) 555-0142 |
          https://www.linkedin.com/in/jordan-rivera-dev
        </Text>
        <Text style={s.h}>SUMMARY</Text>
        <Text>Full-stack engineer with 8 years of experience building web products.</Text>
        <Text style={s.h}>EXPERIENCE</Text>
        <Text style={s.bold}>Senior Software Engineer</Text>
        <Text>Brightline Health, Portland, OR</Text>
        <Text>Apr 2021 – Present</Text>
        <Text style={s.bullet}>
          • Led the rebuild of the patient portal in Next.js, cutting load time by 40%.
        </Text>
        <Text style={s.bold}>Software Engineer</Text>
        <Text>Cascade Commerce, Seattle, WA</Text>
        <Text>Jun 2016 – Mar 2021</Text>
        <Text style={s.bullet}>• Built the checkout flow in React, raising conversion by 12%.</Text>
        <Text style={s.h}>EDUCATION</Text>
        <Text style={s.bold}>B.S. Computer Science</Text>
        <Text>University of Oregon</Text>
        <Text>Sep 2012 – Jun 2016</Text>
        <Text style={s.h}>SKILLS</Text>
        <Text>TypeScript, React, Next.js, Node.js, PostgreSQL, AWS</Text>
      </Page>
    </Document>
  );
}

/** A "scanned" resume: shapes only, no text layer. */
function ImageOnlyResume() {
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <Svg width={540} height={700}>
          <Rect x={0} y={0} width={300} height={24} fill="#18181b" />
          {Array.from({ length: 20 }, (_, i) => (
            <Rect
              key={i}
              x={0}
              y={60 + i * 28}
              width={500 - (i % 4) * 60}
              height={10}
              fill="#a1a1aa"
            />
          ))}
        </Svg>
      </Page>
    </Document>
  );
}

function para(text: string, opts: { bold?: boolean } = {}) {
  return new Paragraph({ children: [new TextRun({ text, bold: opts.bold })] });
}

/** DOCX with contact info in the page header, skills in a table, and a hidden link. */
function docxWithIssues() {
  const cell = (text: string) => new TableCell({ children: [para(text)] });
  return new DocxDocument({
    sections: [
      {
        headers: {
          default: new Header({
            children: [para("Jordan Rivera | jordan.rivera@example.com | +1 (415) 555-0142")],
          }),
        },
        children: [
          para("Senior Full-Stack Engineer", { bold: true }),
          para("About Me", { bold: true }),
          para("Full-stack engineer with 8 years of experience building web products."),
          para("Experience", { bold: true }),
          para("Senior Software Engineer"),
          para("Brightline Health"),
          para("April 2021 – Present"),
          para("Led the rebuild of the patient portal in Next.js, cutting load time by 40%."),
          para("Education", { bold: true }),
          para("B.S. Computer Science, University of Oregon, 2012 – 2016"),
          para("Skills", { bold: true }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [cell("TypeScript"), cell("Expert")] }),
              new TableRow({ children: [cell("PostgreSQL"), cell("Advanced")] }),
            ],
          }),
          new Paragraph({
            children: [
              new ExternalHyperlink({
                link: "https://jordan-rivera.example.com",
                children: [new TextRun({ text: "Portfolio", style: "Hyperlink" })],
              }),
            ],
          }),
        ],
      },
    ],
  });
}

function cleanDocx() {
  return new DocxDocument({
    sections: [
      {
        children: [
          para("Jordan Rivera", { bold: true }),
          para("Portland, OR | jordan.rivera@example.com | +1 (415) 555-0142"),
          para("Summary", { bold: true }),
          para("Full-stack engineer with 8 years of experience building web products."),
          para("Experience", { bold: true }),
          para("Senior Software Engineer"),
          para("Brightline Health"),
          para("Apr 2021 – Present"),
          para("Education", { bold: true }),
          para("B.S. Computer Science"),
          para("University of Oregon"),
          para("Sep 2012 – Jun 2016"),
          para("Skills", { bold: true }),
          para("TypeScript, React, Next.js, Node.js, PostgreSQL, AWS"),
        ],
      },
    ],
  });
}

async function main() {
  mkdirSync(FIXTURES, { recursive: true });
  mkdirSync(SAMPLES, { recursive: true });

  const twoColumn = await renderToBuffer(<TwoColumnResume />);
  writeFileSync(join(FIXTURES, "two-column.pdf"), twoColumn);
  writeFileSync(join(SAMPLES, "Jordan_Rivera_Designed_Resume.pdf"), twoColumn);
  writeFileSync(join(FIXTURES, "clean.pdf"), await renderToBuffer(<CleanResume />));
  writeFileSync(join(FIXTURES, "image-only.pdf"), await renderToBuffer(<ImageOnlyResume />));
  writeFileSync(join(FIXTURES, "issues.docx"), await Packer.toBuffer(docxWithIssues()));
  writeFileSync(join(FIXTURES, "clean.docx"), await Packer.toBuffer(cleanDocx()));
  console.log("Wrote fixtures to tests/fixtures and public/samples");
}

void main();
