"use client";

import { AlertTriangle, CheckCircle2, Plus, X } from "lucide-react";
import { useId } from "react";

import type { HonestyFlag } from "@/lib/resume/honesty";
import { cn } from "@/lib/utils";

const INPUT =
  "w-full rounded-md border border-border bg-console px-3 py-2 text-sm placeholder:text-subtle-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none";

export function Field({
  label,
  value,
  onChange,
  path,
  flag,
  placeholder,
  hint,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  path: string;
  flag?: HonestyFlag;
  placeholder?: string;
  hint?: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="font-mono text-xs text-muted-foreground">
          {label}
        </label>
        {hint}
      </div>
      <input
        id={id}
        data-path={path}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!flag || undefined}
        className={cn(INPUT, flag && "border-warning focus:border-warning focus:ring-warning")}
      />
      {flag && <FlagNote flag={flag} />}
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  path,
  rows = 4,
  footer,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  path: string;
  rows?: number;
  footer?: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-mono text-xs text-muted-foreground">
        {label}
      </label>
      <textarea
        id={id}
        data-path={path}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(INPUT, "leading-relaxed")}
      />
      {footer}
    </div>
  );
}

export function FlagNote({ flag }: { flag: HonestyFlag }) {
  return (
    <p className="flex items-start gap-1.5 font-mono text-xs text-amber-300">
      <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
      {flag.message} Fix it, or keep it if you added it on purpose.
    </p>
  );
}

/** An editable list of single-line entries (bullets, links, details). */
export function ListEditor({
  label,
  items,
  onChange,
  path,
  flags,
  addLabel,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  path: string;
  flags: Map<string, HonestyFlag>;
  addLabel: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => {
          const flag = flags.get(`${path}.${i}`);
          return (
            <li key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span aria-hidden className="text-subtle-foreground">
                  •
                </span>
                <input
                  aria-label={`${label} ${i + 1}`}
                  data-path={`${path}.${i}`}
                  value={item}
                  placeholder={placeholder}
                  onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
                  className={cn(INPUT, "py-1.5", flag && "border-warning")}
                />
                <IconButton
                  label={`Remove ${label.toLowerCase()} ${i + 1}`}
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                >
                  <X className="size-4" />
                </IconButton>
              </div>
              {flag && (
                <p className="pl-5 font-mono text-xs text-amber-300">
                  <AlertTriangle aria-hidden className="mr-1 inline size-3.5" />
                  {flag.message}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <AddButton onClick={() => onChange([...items, ""])}>{addLabel}</AddButton>
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="shrink-0 rounded-sm p-1 text-subtle-foreground transition-colors hover:bg-raised hover:text-foreground"
    >
      {children}
    </button>
  );
}

export function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
    >
      <Plus aria-hidden className="size-3.5" />
      {children}
    </button>
  );
}

export function SectionCard({
  n,
  title,
  icon: Icon,
  verified,
  action,
  children,
}: {
  n: number;
  title: string;
  icon: typeof Plus;
  verified?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`section-${n}`}
      className="rounded-lg border border-border bg-panel p-5"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <h2 id={`section-${n}`} className="flex items-center gap-2 text-lg font-medium">
          <Icon aria-hidden className="size-4 text-primary-text" />
          {n}. {title}
        </h2>
        <div className="flex items-center gap-2">
          {verified !== undefined &&
            (verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-600 bg-emerald-950/30 px-2 py-0.5 font-mono text-xs text-emerald-400">
                <CheckCircle2 aria-hidden className="size-3.5" />
                Matches your original
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-amber-600 bg-amber-950/30 px-2 py-0.5 font-mono text-xs text-amber-400">
                <AlertTriangle aria-hidden className="size-3.5" />
                Needs review
              </span>
            ))}
          {action}
        </div>
      </header>
      {children}
    </section>
  );
}
