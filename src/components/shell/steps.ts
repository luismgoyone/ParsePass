export type StepId = "upload" | "diagnostic" | "review" | "export";

export const STEPS: { id: StepId; label: string; href: string }[] = [
  { id: "upload", label: "Upload", href: "/" },
  { id: "diagnostic", label: "Diagnostic", href: "/diagnostic" },
  { id: "review", label: "Review & Edit", href: "/review" },
  { id: "export", label: "Export", href: "/export" },
];

export function stepForPath(pathname: string): StepId {
  return STEPS.find((s) => s.href !== "/" && pathname.startsWith(s.href))?.id ?? "upload";
}
