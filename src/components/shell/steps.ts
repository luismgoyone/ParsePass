export type StepId = "upload" | "diagnostic" | "review" | "export";

/** `short` labels fit four across a phone screen. */
export const STEPS: { id: StepId; label: string; short: string; href: string }[] = [
  { id: "upload", label: "Upload", short: "Upload", href: "/" },
  { id: "diagnostic", label: "Diagnostic", short: "Diagnose", href: "/diagnostic" },
  { id: "review", label: "Review & Edit", short: "Review", href: "/review" },
  { id: "export", label: "Export", short: "Export", href: "/export" },
];

export function stepForPath(pathname: string): StepId {
  return STEPS.find((s) => s.href !== "/" && pathname.startsWith(s.href))?.id ?? "upload";
}
