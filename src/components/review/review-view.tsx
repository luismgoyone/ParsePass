"use client";

import {
  AlertTriangle,
  Award,
  Briefcase,
  CheckCircle2,
  FolderGit2,
  GraduationCap,
  IdCard,
  ListTree,
  RotateCcw,
  ShieldCheck,
  Text,
  Wrench,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Loading, NeedsUpload } from "@/components/diagnostic/diagnostic-view";
import { useSession } from "@/components/session/session-provider";
import { formatRange } from "@/lib/ats/dates";
import { checkHonesty, type HonestyFlag, type HonestyKind } from "@/lib/resume/honesty";
import { EMPTY_EXPERIENCE, type Resume } from "@/lib/resume/schema";

import { AddButton, Field, IconButton, ListEditor, SectionCard, TextArea } from "./fields";

export function ReviewView({ next }: { next?: React.ReactNode }) {
  const { ready, doc, resume, extracted, model, setResume, revertResume, ai } = useSession();
  const report = useMemo(
    () => (resume && doc ? checkHonesty(resume, doc.sourceText) : null),
    [resume, doc],
  );

  if (!ready) return <Loading />;
  if (!doc) return <NeedsUpload />;
  if (!resume || !report) {
    return (
      <NeedsUpload
        message={`Run the diagnostic and structure your resume with ${ai.label} first.`}
      />
    );
  }

  const flags = new Map(report.flags.map((f) => [f.path, f]));
  const hasFlag = (prefix: string) => report.flags.some((f) => f.path.startsWith(prefix));
  const edit = (change: (draft: Resume) => void) => {
    const draft = structuredClone(resume);
    change(draft);
    setResume(draft);
  };
  const edited = JSON.stringify(resume) !== JSON.stringify(extracted);

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2 font-mono text-xs md:px-6">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1">
          <ListTree aria-hidden className="size-3.5 text-muted-foreground" />
          Structured by {model ?? ai.label}
          <span className="text-subtle-foreground">(JSON schema, validated with Zod)</span>
        </span>
        <HonestyChip flags={report.flags.length} />
      </div>

      <div className="grid flex-1 gap-5 p-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <SectionCard
            n={1}
            title="Contact information"
            icon={IdCard}
            verified={!hasFlag("contact")}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Full name"
                path="contact.name"
                value={resume.contact.name}
                onChange={(v) => edit((d) => void (d.contact.name = v))}
              />
              <Field
                label="Headline / title"
                path="contact.headline"
                value={resume.contact.headline}
                onChange={(v) => edit((d) => void (d.contact.headline = v))}
              />
              <Field
                label="Email"
                path="contact.email"
                flag={flags.get("contact.email")}
                value={resume.contact.email}
                onChange={(v) => edit((d) => void (d.contact.email = v))}
              />
              <Field
                label="Phone"
                path="contact.phone"
                flag={flags.get("contact.phone")}
                value={resume.contact.phone}
                onChange={(v) => edit((d) => void (d.contact.phone = v))}
              />
              <Field
                label="Location"
                path="contact.location"
                value={resume.contact.location}
                placeholder="City, State"
                onChange={(v) => edit((d) => void (d.contact.location = v))}
              />
              <ListEditor
                label="Links"
                path="contact.links"
                items={resume.contact.links}
                flags={flags}
                addLabel="Add link"
                placeholder="https://…"
                onChange={(v) => edit((d) => void (d.contact.links = v))}
              />
            </div>
          </SectionCard>

          <SectionCard n={2} title="Summary" icon={Text} verified={!hasFlag("summary")}>
            <TextArea
              label="Professional summary"
              path="summary"
              value={resume.summary}
              onChange={(v) => edit((d) => void (d.summary = v))}
              footer={
                <p className="flex justify-between font-mono text-xs text-subtle-foreground">
                  <span>Keep it to two or three sentences.</span>
                  <span>{resume.summary.length} characters</span>
                </p>
              }
            />
            <FlagsFor flags={report.flags} prefix="summary" />
          </SectionCard>

          <SectionCard
            n={3}
            title="Experience"
            icon={Briefcase}
            verified={!hasFlag("experience")}
            action={
              <AddButton
                onClick={() =>
                  edit((d) => void d.experience.push({ ...EMPTY_EXPERIENCE, bullets: [""] }))
                }
              >
                Add role
              </AddButton>
            }
          >
            <div className="flex flex-col gap-4">
              {resume.experience.map((job, i) => (
                <div key={i} className="rounded-md border border-border bg-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-xs text-subtle-foreground">ROLE {i + 1}</span>
                    <IconButton
                      label={`Remove role ${i + 1}`}
                      onClick={() => edit((d) => void d.experience.splice(i, 1))}
                    >
                      <X className="size-4" />
                    </IconButton>
                  </div>
                  <div className="mb-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Field
                      label="Job title"
                      path={`experience.${i}.title`}
                      flag={flags.get(`experience.${i}.title`)}
                      value={job.title}
                      onChange={(v) => edit((d) => void (d.experience[i].title = v))}
                    />
                    <Field
                      label="Company"
                      path={`experience.${i}.company`}
                      flag={flags.get(`experience.${i}.company`)}
                      value={job.company}
                      onChange={(v) => edit((d) => void (d.experience[i].company = v))}
                    />
                    <Field
                      label="Location"
                      path={`experience.${i}.location`}
                      value={job.location}
                      onChange={(v) => edit((d) => void (d.experience[i].location = v))}
                    />
                    <DateRange
                      path={`experience.${i}`}
                      start={job.start}
                      end={job.end}
                      flags={flags}
                      onChange={(start, end) =>
                        edit((d) => void Object.assign(d.experience[i], { start, end }))
                      }
                    />
                  </div>
                  <ListEditor
                    label="Bullets"
                    path={`experience.${i}.bullets`}
                    items={job.bullets}
                    flags={flags}
                    addLabel="Add bullet"
                    onChange={(v) => edit((d) => void (d.experience[i].bullets = v))}
                  />
                </div>
              ))}
              {resume.experience.length === 0 && (
                <Empty>No roles found. Add one if your resume lists work experience.</Empty>
              )}
            </div>
          </SectionCard>

          <SectionCard
            n={4}
            title="Skills"
            icon={Wrench}
            verified={!hasFlag("skills")}
            action={
              <AddButton
                onClick={() => edit((d) => void d.skills.push({ category: "Skills", items: [] }))}
              >
                Add group
              </AddButton>
            }
          >
            <div className="flex flex-col gap-3">
              {resume.skills.map((group, i) => (
                <SkillGroupEditor
                  key={i}
                  index={i}
                  category={group.category}
                  items={group.items}
                  flags={flags}
                  onCategory={(v) => edit((d) => void (d.skills[i].category = v))}
                  onItems={(v) => edit((d) => void (d.skills[i].items = v))}
                  onRemove={() => edit((d) => void d.skills.splice(i, 1))}
                />
              ))}
              {resume.skills.length === 0 && <Empty>No skills found.</Empty>}
            </div>
          </SectionCard>

          <SectionCard
            n={5}
            title="Education"
            icon={GraduationCap}
            verified={!hasFlag("education")}
            action={
              <AddButton
                onClick={() =>
                  edit(
                    (d) =>
                      void d.education.push({
                        degree: "",
                        school: "",
                        location: "",
                        start: "",
                        end: "",
                        details: [],
                      }),
                  )
                }
              >
                Add education
              </AddButton>
            }
          >
            <div className="flex flex-col gap-4">
              {resume.education.map((ed, i) => (
                <div key={i} className="rounded-md border border-border bg-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-xs text-subtle-foreground">
                      EDUCATION {i + 1}
                    </span>
                    <IconButton
                      label={`Remove education ${i + 1}`}
                      onClick={() => edit((d) => void d.education.splice(i, 1))}
                    >
                      <X className="size-4" />
                    </IconButton>
                  </div>
                  <div className="mb-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Field
                      label="Degree"
                      path={`education.${i}.degree`}
                      flag={flags.get(`education.${i}.degree`)}
                      value={ed.degree}
                      onChange={(v) => edit((d) => void (d.education[i].degree = v))}
                    />
                    <Field
                      label="School"
                      path={`education.${i}.school`}
                      flag={flags.get(`education.${i}.school`)}
                      value={ed.school}
                      onChange={(v) => edit((d) => void (d.education[i].school = v))}
                    />
                    <Field
                      label="Location"
                      path={`education.${i}.location`}
                      value={ed.location}
                      onChange={(v) => edit((d) => void (d.education[i].location = v))}
                    />
                    <DateRange
                      path={`education.${i}`}
                      start={ed.start}
                      end={ed.end}
                      flags={flags}
                      onChange={(start, end) =>
                        edit((d) => void Object.assign(d.education[i], { start, end }))
                      }
                    />
                  </div>
                  <ListEditor
                    label="Details"
                    path={`education.${i}.details`}
                    items={ed.details}
                    flags={flags}
                    addLabel="Add detail"
                    onChange={(v) => edit((d) => void (d.education[i].details = v))}
                  />
                </div>
              ))}
              {resume.education.length === 0 && <Empty>No education found.</Empty>}
            </div>
          </SectionCard>

          <SectionCard
            n={6}
            title="Projects"
            icon={FolderGit2}
            action={
              <AddButton
                onClick={() =>
                  edit((d) => void d.projects.push({ name: "", link: "", bullets: [] }))
                }
              >
                Add project
              </AddButton>
            }
          >
            <div className="flex flex-col gap-4">
              {resume.projects.map((p, i) => (
                <div key={i} className="rounded-md border border-border bg-card p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="grid flex-1 gap-3 md:grid-cols-2">
                      <Field
                        label="Project"
                        path={`projects.${i}.name`}
                        value={p.name}
                        onChange={(v) => edit((d) => void (d.projects[i].name = v))}
                      />
                      <Field
                        label="Link"
                        path={`projects.${i}.link`}
                        value={p.link}
                        placeholder="https://…"
                        onChange={(v) => edit((d) => void (d.projects[i].link = v))}
                      />
                    </div>
                    <IconButton
                      label={`Remove project ${i + 1}`}
                      onClick={() => edit((d) => void d.projects.splice(i, 1))}
                    >
                      <X className="size-4" />
                    </IconButton>
                  </div>
                  <ListEditor
                    label="Bullets"
                    path={`projects.${i}.bullets`}
                    items={p.bullets}
                    flags={flags}
                    addLabel="Add bullet"
                    onChange={(v) => edit((d) => void (d.projects[i].bullets = v))}
                  />
                </div>
              ))}
              {resume.projects.length === 0 && (
                <Empty>No projects listed. That&apos;s fine: this section is optional.</Empty>
              )}
            </div>
          </SectionCard>

          <SectionCard
            n={7}
            title="Certifications"
            icon={Award}
            verified={!hasFlag("certifications")}
            action={
              <AddButton
                onClick={() =>
                  edit((d) => void d.certifications.push({ name: "", issuer: "", date: "" }))
                }
              >
                Add certification
              </AddButton>
            }
          >
            <div className="flex flex-col gap-3">
              {resume.certifications.map((c, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="grid flex-1 gap-3 md:grid-cols-3">
                    <Field
                      label="Certification"
                      path={`certifications.${i}.name`}
                      value={c.name}
                      onChange={(v) => edit((d) => void (d.certifications[i].name = v))}
                    />
                    <Field
                      label="Issuer"
                      path={`certifications.${i}.issuer`}
                      value={c.issuer}
                      onChange={(v) => edit((d) => void (d.certifications[i].issuer = v))}
                    />
                    <Field
                      label="Date"
                      path={`certifications.${i}.date`}
                      flag={flags.get(`certifications.${i}.date`)}
                      value={c.date}
                      onChange={(v) => edit((d) => void (d.certifications[i].date = v))}
                    />
                  </div>
                  <IconButton
                    label={`Remove certification ${i + 1}`}
                    onClick={() => edit((d) => void d.certifications.splice(i, 1))}
                  >
                    <X className="size-4" />
                  </IconButton>
                </div>
              ))}
              {resume.certifications.length === 0 && (
                <Empty>No certifications listed. Optional.</Empty>
              )}
            </div>
          </SectionCard>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start">
          <HonestyPanel totals={report.totals} flags={report.flags} />
          <details className="rounded-lg border border-border bg-panel">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 font-mono text-xs text-muted-foreground">
              resume.json
              <span className="text-success">Valid schema</span>
            </summary>
            <pre className="max-h-80 overflow-auto border-t border-border bg-console p-4 font-mono text-xs text-muted-foreground">
              {JSON.stringify(resume, null, 2)}
            </pre>
          </details>
        </aside>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-panel/95 px-4 py-3 backdrop-blur md:px-6">
        <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span
            aria-hidden
            className={`size-2 rounded-full ${report.flags.length ? "bg-warning" : "bg-success"}`}
          />
          {report.flags.length
            ? `${report.flags.length} field${report.flags.length === 1 ? "" : "s"} not found in your original`
            : "Every checked field matches your original"}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!edited}
            onClick={revertResume}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 font-mono text-[13px] hover:border-border-strong hover:bg-raised disabled:opacity-50"
          >
            <RotateCcw aria-hidden className="size-4" />
            Revert to {ai.label}&apos;s extraction
          </button>
          {next}
        </div>
      </div>
    </main>
  );
}

function DateRange({
  path,
  start,
  end,
  flags,
  onChange,
}: {
  path: string;
  start: string;
  end: string;
  flags: Map<string, HonestyFlag>;
  onChange: (start: string, end: string) => void;
}) {
  const normalized = formatRange(start, end);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-2">
        <Field
          label="Start"
          path={`${path}.start`}
          flag={flags.get(`${path}.start`)}
          value={start}
          onChange={(v) => onChange(v, end)}
        />
        <Field
          label="End"
          path={`${path}.end`}
          flag={flags.get(`${path}.end`)}
          value={end}
          placeholder="Present"
          onChange={(v) => onChange(start, v)}
        />
      </div>
      {normalized && normalized !== [start, end].filter(Boolean).join(" – ") && (
        <p className="font-mono text-[11px] text-success">Exports as “{normalized}”</p>
      )}
    </div>
  );
}

function SkillGroupEditor({
  index,
  category,
  items,
  flags,
  onCategory,
  onItems,
  onRemove,
}: {
  index: number;
  category: string;
  items: string[];
  flags: Map<string, HonestyFlag>;
  onCategory: (v: string) => void;
  onItems: (v: string[]) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const values = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (values.length) onItems([...items, ...values]);
    setDraft("");
  };
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-end gap-3">
        <Field
          className="max-w-xs flex-1"
          label="Group"
          path={`skills.${index}.category`}
          value={category}
          onChange={onCategory}
        />
        <span className="pb-2 font-mono text-xs text-subtle-foreground">{items.length} skills</span>
        <div className="ml-auto">
          <IconButton label={`Remove skill group ${index + 1}`} onClick={onRemove}>
            <X className="size-4" />
          </IconButton>
        </div>
      </div>
      <ul className="mb-3 flex flex-wrap gap-2">
        {items.map((skill, j) => {
          const flag = flags.get(`skills.${index}.items.${j}`);
          return (
            <li
              key={`${skill}-${j}`}
              title={flag?.message}
              className={`inline-flex items-center gap-1 rounded-sm border py-0.5 pr-1 pl-2 font-mono text-xs ${
                flag
                  ? "border-amber-600 bg-amber-950/30 text-amber-300"
                  : "border-border bg-console"
              }`}
            >
              {flag && <AlertTriangle aria-label="Not in your original" className="size-3" />}
              {skill}
              <button
                type="button"
                aria-label={`Remove ${skill}`}
                onClick={() => onItems(items.filter((_, k) => k !== j))}
                className="rounded-sm p-0.5 text-subtle-foreground hover:bg-raised hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <input
          aria-label={`Add skills to ${category || "group"}`}
          value={draft}
          placeholder="Add a skill (comma-separate several)"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="w-full rounded-md border border-border bg-console px-3 py-1.5 text-sm placeholder:text-subtle-foreground focus:border-primary focus:outline-none"
        />
        <AddButton onClick={add}>Add</AddButton>
      </div>
    </div>
  );
}

const KIND_LABELS: [HonestyKind[], string][] = [
  [["company"], "Companies"],
  [["title"], "Job titles"],
  [["date"], "Dates"],
  [["school", "degree"], "Schools & degrees"],
  [["skill"], "Skills"],
  [["number"], "Numbers in bullets"],
];

function HonestyPanel({
  totals,
  flags,
}: {
  totals: ReturnType<typeof checkHonesty>["totals"];
  flags: HonestyFlag[];
}) {
  return (
    <section aria-labelledby="honesty" className="rounded-lg border border-border bg-panel p-4">
      <header className="mb-2 flex items-center justify-between">
        <h2 id="honesty" className="flex items-center gap-2 text-lg font-medium">
          <ShieldCheck aria-hidden className="size-4 text-primary-text" />
          Honesty check
        </h2>
        <span className="rounded-sm border border-success/60 px-1.5 font-mono text-xs text-success">
          Always on
        </span>
      </header>
      <p className="mb-3 font-mono text-xs leading-relaxed text-muted-foreground">
        Every company, title, date, skill and number is matched against the text of your original
        resume.
      </p>
      <ul className="flex flex-col gap-2">
        {KIND_LABELS.map(([kinds, label]) => {
          const checked = kinds.reduce((n, k) => n + totals[k].checked, 0);
          const verified = kinds.reduce((n, k) => n + totals[k].verified, 0);
          const ok = checked === verified;
          return (
            <li
              key={label}
              className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 font-mono text-xs"
            >
              <span className="flex items-center gap-2">
                {ok ? (
                  <CheckCircle2 aria-hidden className="size-4 text-success" />
                ) : (
                  <AlertTriangle aria-hidden className="size-4 text-warning" />
                )}
                {label}
              </span>
              <span className={ok ? "text-success" : "text-warning"}>
                {verified}/{checked} found
              </span>
            </li>
          );
        })}
      </ul>
      {flags.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 font-mono text-xs text-amber-300">Not in your original:</p>
          <ul className="flex flex-col gap-1">
            {flags.map((f) => (
              <li key={f.path}>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.querySelector<HTMLElement>(`[data-path="${f.path}"]`);
                    el?.scrollIntoView({ block: "center", behavior: "smooth" });
                    el?.focus({ preventScroll: true });
                  }}
                  className="w-full truncate rounded-sm px-1 py-0.5 text-left font-mono text-xs text-muted-foreground hover:bg-card hover:text-foreground"
                >
                  {f.kind}: “{f.value}”
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function FlagsFor({ flags, prefix }: { flags: HonestyFlag[]; prefix: string }) {
  const mine = flags.filter((f) => f.path.startsWith(prefix));
  if (!mine.length) return null;
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {mine.map((f, i) => (
        <li key={i} className="font-mono text-xs text-amber-300">
          <AlertTriangle aria-hidden className="mr-1 inline size-3.5" />
          {f.message}
        </li>
      ))}
    </ul>
  );
}

function HonestyChip({ flags }: { flags: number }) {
  return flags === 0 ? (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-950/30 px-2.5 py-1 text-emerald-400">
      <ShieldCheck aria-hidden className="size-3.5" />
      Honesty check: nothing added
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-600 bg-amber-950/30 px-2.5 py-1 text-amber-400">
      <AlertTriangle aria-hidden className="size-3.5" />
      Honesty check: {flags} item{flags === 1 ? "" : "s"} to review
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border p-4 text-center text-muted-foreground">
      {children}
    </p>
  );
}
