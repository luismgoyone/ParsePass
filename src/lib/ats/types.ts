export type SourceKind = "pdf" | "docx" | "text";

/** A run of text on a PDF page. Coordinates are in PDF points with the origin at the top-left. */
export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
}

/** A gap-separated chunk of a line: what a human would read as one phrase. */
export interface Segment {
  text: string;
  x: number;
  right: number;
}

/** One line of the ATS view: what a line-by-line parser reads, left to right. */
export interface AtsLine {
  text: string;
  page: number;
  /** Top of the line in PDF points (PDF only). */
  y?: number;
  segments: Segment[];
}

export interface PageSize {
  width: number;
  height: number;
}

export interface HyperLink {
  url: string;
  /** The visible text the link is attached to. */
  text: string;
}

/** Structure found inside a DOCX package that text extraction alone can't see. */
export interface DocxStructure {
  tables: number;
  textBoxes: number;
  images: number;
  columns: number;
  headerText: string;
  footerText: string;
  /** Text of each paragraph inside a table or text box, to flag those lines in the ATS view. */
  boxedText: string[];
}

export interface ExtractedDoc {
  kind: SourceKind;
  fileName: string;
  pageCount: number;
  pages: PageSize[];
  /** The ATS view: lines in parser reading order. */
  lines: AtsLine[];
  /** All the source text in content order, including headers. What Claude structures. */
  sourceText: string;
  links: HyperLink[];
  fonts: string[];
  docx?: DocxStructure;
}

export type Severity = "critical" | "warning" | "notice";

export interface AtsIssue {
  /** Stable rule ID, e.g. "LAY-01". */
  rule: string;
  severity: Severity;
  title: string;
  /** Plain-language explanation of what's wrong and what an ATS does with it. */
  detail: string;
  /** Short consequence label, e.g. "Scrambled lines". */
  impact: string;
  /** Indices into ExtractedDoc.lines that this issue affects. */
  lines: number[];
  /** For PDF column issues: the x position (points) where the second column starts. */
  columnX?: number;
}

export interface Diagnosis {
  issues: AtsIssue[];
  score: number;
}
