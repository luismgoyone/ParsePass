# ParsePass Spec

Sep 29, 2026 · Luis

## Overview

ParsePass turns any resume into a clean, ATS-friendly version and shows the job seeker exactly what an applicant tracking system will read.

Most resumes fail ATS parsing for boring reasons: two-column layouts, tables, text in headers, icons, and unusual section names. Job seekers can't see this, so they never know why they get no replies. ParsePass fixes the format, keeps the content true, and explains every change.

**Who it's for:** job seekers, especially developers and career switchers, who have a designed resume and want a version that parses cleanly.

**Why it's in the portfolio:** it's a real AI feature with a live demo, built from a problem Luis solved for his own resume.

## Goals and non-goals

**Goals**

- Convert a PDF or DOCX resume into a single-column ATS format in under a minute.
- Show an "ATS view": the plain text a parser would extract, before and after.
- Explain each change in plain language ("moved your skills out of a table").
- Optionally compare the resume to a pasted job description and list missing keywords.
- Export to PDF and DOCX.

**Non-goals**

- Writing new experience, inflating titles, or adding skills the user didn't list.
- Keyword stuffing or hidden text to game scanners.
- Being a full resume builder with dozens of templates. One excellent ATS template is enough for version one.
- Applying to jobs on the user's behalf.

## User flow

No account is needed for the first conversion, so a recruiter or client can try it in seconds.

1. **Upload** a PDF or DOCX resume (max 5 MB), or paste plain text.
2. **See the problems.** ParsePass shows the "ATS view" of the original, with issues flagged: columns, tables, icons, text in headers, missing sections.
3. **Review the structured resume.** Claude extracts contact info, summary, experience, education, and skills into editable fields. The user fixes anything that looks wrong.
4. **Optional: add a job description.** ParsePass lists keywords from the job that appear in the resume and ones that are missing. The user decides what to add; nothing is added automatically.
5. **Preview** the ATS version side by side with the "ATS view" of the new file, plus a list of changes made.
6. **Download** as PDF or DOCX.

## Features

Version one ships the six items marked MVP; everything else waits until people are using it.

| Feature                             | Release | Notes                               |
| ----------------------------------- | ------- | ----------------------------------- |
| PDF and DOCX upload                 | MVP     | Paste text as a fallback            |
| ATS view with issues flagged        | MVP     | Before and after                    |
| Structured, editable resume fields  | MVP     | Claude does the extraction          |
| One ATS template                    | MVP     | Single column, standard headings    |
| Change log                          | MVP     | Plain-language list of what changed |
| PDF and DOCX export                 | MVP     | Text must stay selectable           |
| Job description keyword match       | V2      | Suggests, never inserts             |
| Bullet rewrite suggestions          | V2      | Stronger verbs, same facts          |
| Accounts and saved versions         | V2      | One resume per job                  |
| Cover letter from the same data     | Later   |                                     |
| Browser extension to grab job posts | Later   |                                     |

## ATS rules the output follows

The exported file follows these rules every time, and the issue checker flags the original when it breaks them.

- Single column, no tables, text boxes, or graphics.
- Contact details in the body, not in the page header or footer.
- Standard section headings: Summary, Experience, Education, Skills, Projects, Certifications.
- Standard fonts (Arial, Calibri, or similar) at 10 to 12 pt.
- One date format throughout, such as "Mar 2025 – Present".
- Job title, company, and dates on their own lines for each role.
- Plain round bullets, no icons or emoji.
- Real text in the PDF (selectable, not an image), and links written out in full.
- File name like `Firstname_Lastname_Resume.pdf`.

## How it uses Claude

Claude only restructures what the user wrote; it never invents experience, and the code checks that.

**Extraction (MVP).** The raw text from the file goes to Claude with a strict JSON schema (contact, summary, experience, education, skills, projects). Using tool calling with a schema means the app always gets valid, typed data back.

**Keyword match (V2).** Claude reads the job description and returns required skills and keywords. The app does the matching itself, so the score is repeatable.

**Bullet suggestions (V2).** Claude suggests clearer wording for a bullet. The user accepts or rejects each one.

**Honesty rules**

- The prompt forbids adding companies, titles, dates, numbers, or skills that aren't in the source text.
- After extraction, the app checks that every company, title, and date in the output appears in the original text, and flags anything that doesn't.
- Every suggestion is shown as a diff the user must accept.

**Model:** a current Claude Sonnet model for extraction and suggestions. Test a Haiku model for extraction later if cost matters.

## Tech stack

The stack matches Outpost, so both projects share setup, CI, and habits.

| Layer         | Choice                                      | Why                                      |
| ------------- | ------------------------------------------- | ---------------------------------------- |
| App           | Next.js (App Router), TypeScript, pnpm      | Known stack, deploys on Vercel           |
| UI            | Tailwind CSS, shadcn/ui                     | Clean forms and panels quickly           |
| PDF text      | unpdf (pdf.js)                              | Same kind of text extraction an ATS does |
| DOCX text     | mammoth                                     | Reliable DOCX to text                    |
| AI            | Claude API via the Anthropic TypeScript SDK | Tool calling with a JSON schema          |
| Validation    | Zod                                         | Checks Claude's output before use        |
| PDF export    | React PDF (@react-pdf/renderer)             | Real, selectable text                    |
| DOCX export   | docx (npm)                                  | Native Word file                         |
| Rate limiting | Upstash Redis                               | Protects the API key on a free tool      |
| Tests         | Vitest, Playwright                          | Unit tests plus end-to-end proof videos  |
| Hosting       | Vercel                                      | Preview link on every PR                 |

The ATS view is the key trick: after export, the app runs its own PDF text extraction on the new file and shows the result, so users see proof that it parses.

**Request flow:** Upload (PDF or DOCX, browser) → Extract text (unpdf or mammoth) → Claude API (text to resume JSON) → Validate (Zod + honesty check) → User edits (fields in the browser) → Export (PDF and DOCX) → ATS view (re-extract the export).

The resume text goes only to the Claude API, and the last step runs the same text extraction on the export that the first step ran on the upload.

## Data, privacy and cost

Resumes hold personal data, so version one stores nothing.

- Files are processed in memory and discarded after the response. No database in the MVP.
- The edited resume lives in the browser until the user downloads it.
- A short privacy note on the upload screen says this in one sentence.
- The Anthropic API key stays on the server; the browser never sees it.
- Rate limit: a few conversions per visitor per day, to cap API spend on a free demo.
- Log only counts and errors, never resume text.
- Cost per conversion is unknown until measured. Log token usage from the first day and set a monthly spend limit in the Anthropic console.

## Milestones and success measures

Each milestone ends with a deployed preview and a Playwright video, so progress is always demo-able.

1. **Scaffold:** repo, CI (lint, typecheck, unit, build, Playwright), repo settings, landing page.
2. **Upload and ATS view:** PDF and DOCX text extraction with issues flagged.
3. **Claude extraction:** structured fields, Zod validation, honesty check, editable form.
4. **Export:** ATS template to PDF and DOCX, plus the after-export ATS view.
5. **Polish and launch:** privacy note, rate limiting, error states, README with demo video, link from the portfolio.
6. **V2:** job description keyword match and bullet suggestions.

**Success looks like**

- Ten real resumes, including two-column and designed ones, convert with every job, company, and date intact.
- The exported PDF's extracted text matches the edited fields exactly.
- A first-time visitor gets a download without instructions.
- The portfolio page shows a before and after, the live link, and a short video.

## Design

UI designs live in the Google Stitch project **"ParsePass"** (Stitch MCP server `stitch`, project
`11086528156520217138`). Exported screenshots are in [`docs/mockups/`](mockups/):

| Screen                      | Route         | Mockup                                                                   |
| --------------------------- | ------------- | ------------------------------------------------------------------------ |
| 1. Landing & Upload         | `/`           | [1-landing-upload.png](mockups/1-landing-upload.png)                     |
| 2. ATS Issue Diagnostic     | `/diagnostic` | [2-ats-issue-diagnostic.png](mockups/2-ats-issue-diagnostic.png)         |
| 3. Structured Resume Editor | `/review`     | [3-structured-resume-editor.png](mockups/3-structured-resume-editor.png) |
| 4. Export & ATS Proof       | `/export`     | [4-export-ats-proof.png](mockups/4-export-ats-proof.png)                 |

Design system: **Technical Parser Minimal** (dark only). Tokens live in `src/app/globals.css`.

- Surfaces step by tone, not shadow: canvas `#09090b` → panel `#121215` → card `#18181b` →
  raised `#27272a`, each with a 1px `#27272a` border.
- One accent, indigo `#4f46e5`, for actions, selection and AI processing.
- Semantics: success `#10b981` (parsed / verified), warning `#f59e0b` (degraded),
  destructive `#ef4444` (broken structure). Severity is always a label or icon plus color.
- Geist for UI and prose; JetBrains Mono for parser output, rule IDs, scores, file names and chips.
- 4px radius for controls, 8px for panels. No pill shapes. Headings never above weight 600.

The mockups contain some placeholder claims (WebAssembly, SOC 2, "Workday / Taleo simulation",
fake latency numbers). The app follows the mockups' layout but keeps copy true to what it does.

## Architecture notes

- **Text extraction runs in the browser.** Vercel functions accept request bodies up to 4.5 MB,
  below the 5 MB upload limit, and extracting client-side also means the file itself never
  leaves the device. Only the extracted text is sent to `/api/extract`, which calls Claude.
- **The ATS view** reconstructs text line by line (items grouped by baseline, sorted left to
  right), the way a naive parser reads a page. That is what exposes column interleaving.
  The same function runs on the exported PDF.
- **Export runs in the browser** (`@react-pdf/renderer`, `docx`), then the exported PDF is
  re-extracted with the same code to produce the "after" ATS view.
- Issue checks are pure functions over extracted text and layout (`src/lib/ats/`), so they are
  unit-tested against generated PDF and DOCX fixtures.
- **Structured outputs instead of a forced tool call.** The spec calls for "tool calling with a
  schema". Current Sonnet models reject a forced `tool_choice`, so extraction uses structured
  outputs (`output_config.format`, built from the Zod `ResumeSchema`) on `claude-sonnet-5-5`.
  Same guarantee: the response is schema-valid JSON, and the app validates it with Zod again.
  Server-side refusal fallback (`fallbacks: "default"`) is enabled.
- **Claude copies, the app normalizes.** Claude copies dates and text exactly as written; the app
  converts dates to "Mon YYYY" itself (`src/lib/ats/dates.ts`). That keeps the honesty check
  (`src/lib/resume/honesty.ts`) a plain match against the source text. The check re-runs on
  every edit, so anything a user adds is visible too.
