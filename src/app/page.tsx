import {
  BadgeCheck,
  Columns2,
  FileDown,
  FileText,
  ListChecks,
  ScanText,
  Terminal,
} from "lucide-react";

import { UploadPanel } from "@/components/upload/upload-panel";
import { aiInfo } from "@/lib/extraction/provider";

const GUARANTEES = [
  { icon: Columns2, label: "Single-column ATS template", tone: "text-success" },
  { icon: BadgeCheck, label: "Honesty check: nothing invented", tone: "text-primary-text" },
  { icon: FileDown, label: "PDF & DOCX export", tone: "text-warning" },
];

const ATS_RULES = [
  "Single column. No tables, text boxes or graphics.",
  "Contact details in the body, not the page header or footer.",
  "Standard headings: Summary, Experience, Education, Skills, Projects, Certifications.",
  "Standard fonts (Arial, Helvetica or similar) at 10 pt, or 9.5 pt only when that fits it on one page.",
  "One date format throughout, like “Mar 2025 – Present”.",
  "Job title on its own line, then company, location and dates on the next.",
  "Plain round bullets. No icons or emoji.",
  "Real, selectable text, with links written out in full.",
  "File name like Firstname_Lastname_Resume.pdf.",
];

export default function HomePage() {
  return (
    <main className="flex w-full flex-col gap-16 px-page py-10">
      <section className="mx-auto flex max-w-4xl flex-col items-center gap-4 pt-4 text-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-x-2 rounded-md border border-border bg-console px-2.5 py-1 font-mono text-xs text-muted-foreground">
          <span className="text-warning">unpdf + mammoth</span>
          <span className="hidden text-subtle-foreground sm:inline">/</span>
          <span>the same text extraction an ATS does</span>
        </div>
        <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance md:text-5xl">
          See what the ATS <span className="text-primary-text">actually reads</span> from your
          resume.
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Most resumes fail applicant tracking systems for boring reasons: two-column layouts,
          tables, text in headers and icons. ParsePass converts yours into a clean single-column
          format, keeps your content true, and proves how a parser reads it.
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {GUARANTEES.map(({ icon: Icon, label, tone }) => (
            <li
              key={label}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1 font-mono text-xs"
            >
              <Icon aria-hidden className={`size-4 ${tone}`} />
              {label}
            </li>
          ))}
        </ul>
      </section>

      <UploadPanel />

      <CaseStudy />

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="border-b border-border pb-2">
          <p className="font-mono text-xs text-subtle-foreground">HOW IT WORKS</p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Built for parser verification, not design fluff.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Feature
            icon={ScanText}
            title="The real ATS view"
            body="Your file's text is extracted the way a parser does it, line by line. Scrambled columns, dropped tables and hidden header text show up exactly as an ATS would see them."
            foot="Before and after, same extractor"
          />
          <Feature
            icon={ListChecks}
            title="Structured and editable"
            body={`${aiInfo().label} restructures what you wrote into contact, summary, experience, education and skills. You review every field before anything is exported.`}
            foot="Typed JSON schema, validated with Zod"
          />
          <Feature
            icon={BadgeCheck}
            title="Nothing invented"
            body="Every company, title and date in the output is checked against your original text. Anything that doesn't match is flagged, never silently added."
            foot="Honesty check on every conversion"
          />
        </div>
      </section>

      <section
        id="ats-rules"
        className="mx-auto w-full max-w-5xl scroll-mt-20 rounded-lg border border-border bg-panel"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Terminal aria-hidden className="size-4 text-subtle-foreground" />
          <h2 className="font-mono text-[13px]">
            ATS_RULES: the exported file follows these every time
          </h2>
        </div>
        <ol className="grid gap-x-8 gap-y-2 p-4 md:grid-cols-2">
          {ATS_RULES.map((rule, i) => (
            <li key={rule} className="flex gap-3 text-sm text-muted-foreground">
              <span className="font-mono text-xs leading-5 text-subtle-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              {rule}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
  foot,
}: {
  icon: typeof FileText;
  title: string;
  body: string;
  foot: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-5">
      <span className="flex size-9 items-center justify-center rounded-md border border-border bg-card">
        <Icon aria-hidden className="size-4 text-primary-text" />
      </span>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="flex-1 leading-relaxed text-muted-foreground">{body}</p>
      <p className="flex items-center gap-1.5 border-t border-border pt-3 font-mono text-xs text-subtle-foreground">
        <BadgeCheck aria-hidden className="size-3.5 text-success" />
        {foot}
      </p>
    </div>
  );
}

/** A static before/after of a two-column resume and the text a line-by-line parser gets from it. */
function CaseStudy() {
  const lines: { text: string; tone?: "error" | "warning" }[] = [
    { text: "ALEX R. MORGAN alex@morgan.dev San Francisco, CA" },
    { text: "SKILLS Staff Infrastructure Engineer 2021 – PRESENT", tone: "error" },
    { text: "Rust & Go Nexus Cloud Platforms Built a low-latency event" },
    { text: "Kubernetes mesh processing 4.2M msgs/sec. Cut cold start 45%.", tone: "warning" },
    { text: "CERTIFICATIONS Principal Cloud Engineer 2018 – 2021", tone: "error" },
    { text: "AWS Solutions Architect Aether Microservices Led multi-region", tone: "warning" },
  ];
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-col justify-between gap-2 border-b border-border pb-2 md:flex-row md:items-end">
        <div>
          <p className="flex items-center gap-2 font-mono text-xs text-subtle-foreground">
            <span aria-hidden className="size-2 rounded-full bg-destructive" />
            WHY RESUMES FAIL
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            A two-column resume, read by a parser
          </h2>
        </div>
        <p className="font-mono text-xs text-subtle-foreground">
          Reading order: line by line, left to right
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-panel">
          <div className="flex h-10 items-center justify-between border-b border-border bg-card px-4">
            <span className="flex items-center gap-2 font-mono text-[13px]">
              <FileText aria-hidden className="size-4 text-muted-foreground" />
              What you designed
            </span>
            <span className="font-mono text-xs text-subtle-foreground">2 columns</span>
          </div>
          <div
            aria-hidden
            className="flex flex-1 flex-col gap-3 bg-white p-5 font-sans text-[11px] text-zinc-900 select-none"
          >
            <div className="flex items-start justify-between border-b border-zinc-200 pb-2">
              <div>
                <p className="text-sm font-bold">ALEX R. MORGAN</p>
                <p className="text-indigo-600">Senior Distributed Systems Architect</p>
              </div>
              <p className="text-right text-[10px] text-zinc-500">
                alex@morgan.dev
                <br />
                San Francisco, CA
              </p>
            </div>
            <div className="grid flex-1 grid-cols-3 gap-3">
              <div className="flex flex-col gap-3 rounded bg-zinc-100 p-2 text-[10px] text-zinc-600">
                <div>
                  <p className="mb-1 font-bold text-zinc-700">SKILLS</p>
                  <p>• Rust &amp; Go</p>
                  <p>• Kubernetes</p>
                  <p>• Raft Consensus</p>
                </div>
                <div>
                  <p className="mb-1 font-bold text-zinc-700">CERTIFICATIONS</p>
                  <p>AWS Solutions Architect</p>
                </div>
              </div>
              <div className="col-span-2 flex flex-col gap-3">
                <div>
                  <p className="flex justify-between font-semibold">
                    Staff Infrastructure Engineer{" "}
                    <span className="font-normal text-zinc-500">2021 – Present</span>
                  </p>
                  <p className="text-indigo-600">Nexus Cloud Platforms</p>
                  <p className="text-zinc-600">
                    Built a low-latency event mesh processing 4.2M msgs/sec. Cut cold start 45%.
                  </p>
                </div>
                <div>
                  <p className="flex justify-between font-semibold">
                    Principal Cloud Engineer{" "}
                    <span className="font-normal text-zinc-500">2018 – 2021</span>
                  </p>
                  <p className="text-indigo-600">Aether Microservices</p>
                  <p className="text-zinc-600">Led multi-region zero-downtime replication.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-panel">
          <div className="flex h-10 items-center justify-between border-b border-border bg-card px-4">
            <span className="flex items-center gap-2 font-mono text-[13px]">
              <Terminal aria-hidden className="size-4 text-muted-foreground" />
              What the ATS reads
            </span>
            <span className="rounded-sm border border-destructive/60 bg-destructive/10 px-1.5 font-mono text-xs text-red-400">
              Scrambled
            </span>
          </div>
          <ol className="flex flex-1 flex-col gap-1 bg-console p-4 font-mono text-[13px] leading-relaxed">
            {lines.map((line, i) => (
              <li
                key={i}
                className={
                  line.tone === "error"
                    ? "border-l-2 border-destructive bg-destructive/10 pl-2 text-red-300"
                    : line.tone === "warning"
                      ? "border-l-2 border-warning bg-warning/10 pl-2 text-amber-200"
                      : "border-l-2 border-transparent pl-2 text-muted-foreground"
                }
              >
                <span className="mr-2 text-subtle-foreground">
                  L{String(i + 1).padStart(2, "0")}
                </span>
                {line.text}
              </li>
            ))}
          </ol>
          <p className="border-t border-border px-4 py-2 font-mono text-xs text-muted-foreground">
            Skills merge into job titles. Certifications land inside experience.
          </p>
        </div>
      </div>
    </section>
  );
}
