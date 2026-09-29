import { z } from "zod";

/*
 * The structured resume. Claude fills it from the user's text; the user edits it; the exporter
 * renders it. Every field is required (use "" or [] when absent) so structured outputs can
 * guarantee the shape, and nothing downstream has to handle undefined.
 */

export const ContactSchema = z.object({
  name: z.string(),
  headline: z.string().describe("Current or target job title, if the resume states one"),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  links: z.array(z.string()).describe("Full URLs or profile paths, exactly as written"),
});

export const ExperienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  start: z.string().describe("Start date exactly as written, e.g. '04/21' or 'March 2021'"),
  end: z.string().describe("End date exactly as written, or 'Present'"),
  bullets: z.array(z.string()),
});

export const EducationSchema = z.object({
  degree: z.string(),
  school: z.string(),
  location: z.string(),
  start: z.string(),
  end: z.string(),
  details: z.array(z.string()),
});

export const SkillGroupSchema = z.object({
  category: z.string().describe("Group name from the resume, or 'Skills' if ungrouped"),
  items: z.array(z.string()),
});

export const ProjectSchema = z.object({
  name: z.string(),
  link: z.string(),
  bullets: z.array(z.string()),
});

export const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  date: z.string(),
});

export const ResumeSchema = z.object({
  contact: ContactSchema,
  summary: z.string(),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  skills: z.array(SkillGroupSchema),
  projects: z.array(ProjectSchema),
  certifications: z.array(CertificationSchema),
});

export type Resume = z.infer<typeof ResumeSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type SkillGroup = z.infer<typeof SkillGroupSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Certification = z.infer<typeof CertificationSchema>;

export const EMPTY_EXPERIENCE: Experience = {
  title: "",
  company: "",
  location: "",
  start: "",
  end: "",
  bullets: [],
};
