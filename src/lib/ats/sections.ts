export type SectionId =
  "summary" | "experience" | "education" | "skills" | "projects" | "certifications";

export const SECTION_LABELS: Record<SectionId, string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
};

/** Headings every ATS maps to the right section. */
const STANDARD: Record<SectionId, string[]> = {
  summary: ["summary", "professional summary", "career summary", "profile", "professional profile"],
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "relevant experience",
    "employment history",
    "work history",
  ],
  education: ["education", "education and training", "academic history"],
  skills: ["skills", "technical skills", "core skills", "key skills", "skills and tools"],
  projects: ["projects", "personal projects", "selected projects", "side projects", "key projects"],
  certifications: [
    "certifications",
    "certificates",
    "licenses and certifications",
    "certifications and licenses",
  ],
};

/** Creative headings that many parsers fail to map, with the standard name to use instead. */
const NON_STANDARD: Record<SectionId, string[]> = {
  summary: [
    "about me",
    "about",
    "who i am",
    "hello",
    "intro",
    "introduction",
    "objective",
    "career objective",
    "bio",
  ],
  experience: [
    "career history",
    "my journey",
    "professional journey",
    "journey",
    "where i have worked",
    "where ive worked",
    "work",
    "career",
    "employment",
    "background",
    "professional background",
    "track record",
  ],
  education: [
    "academic background",
    "academics",
    "schooling",
    "studies",
    "learning",
    "qualifications",
  ],
  skills: [
    "toolbox",
    "my toolbox",
    "tech stack",
    "stack",
    "my stack",
    "expertise",
    "areas of expertise",
    "core competencies",
    "competencies",
    "technologies",
    "tools",
    "what i know",
    "what i do",
    "abilities",
    "strengths",
    "superpowers",
  ],
  projects: ["things i have built", "things ive built", "selected work", "work samples", "builds"],
  certifications: ["credentials", "badges"],
};

export function normalizeHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Could this short piece of text be a section heading? */
export function looksLikeHeading(text: string): boolean {
  const t = text.trim().replace(/:$/, "");
  if (t.length < 3 || t.length > 40) return false;
  if (/[\d@/]|\.$/.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length > 5) return false;
  const letters = t.replace(/[^A-Za-z]/g, "");
  const allCaps = letters.length > 0 && letters === letters.toUpperCase();
  const titleCase = words.every(
    (w) => /^[A-Z&]/.test(w) || /^(and|of|i|to|the|ive|have)$/i.test(w),
  );
  return allCaps || titleCase;
}

export type HeadingMatch = { section: SectionId; standard: boolean };

export function classifyHeading(text: string): HeadingMatch | null {
  const norm = normalizeHeading(text);
  for (const [section, names] of Object.entries(STANDARD) as [SectionId, string[]][]) {
    if (names.includes(norm)) return { section, standard: true };
  }
  for (const [section, names] of Object.entries(NON_STANDARD) as [SectionId, string[]][]) {
    if (names.includes(norm)) return { section, standard: false };
  }
  // Variations on a standard name still map cleanly: "Skills & Technologies",
  // "Relevant Work Experience", "Education and Certifications". The first keyword wins.
  for (const word of norm.split(" ")) {
    const section = KEYWORDS[word];
    if (section) return { section, standard: true };
  }
  return null;
}

/** Words that make a heading unambiguous to an ATS, wherever they appear in it. */
const KEYWORDS: Record<string, SectionId> = {
  summary: "summary",
  experience: "experience",
  education: "education",
  skills: "skills",
  projects: "projects",
  certifications: "certifications",
  certificates: "certifications",
};
