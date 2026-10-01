import { z } from "zod";

export const KeywordSchema = z.object({
  term: z.string().describe("The skill, tool or qualification, in the posting's own wording"),
  aliases: z.array(z.string()).describe("Common equivalent spellings only, e.g. JS for JavaScript"),
  kind: z.enum(["skill", "tool", "qualification", "domain"]),
  importance: z.enum(["required", "preferred"]),
});

export const JobKeywordsSchema = z.object({
  role: z.string().describe("The job title from the posting, or empty"),
  keywords: z.array(KeywordSchema),
});

export type Keyword = z.infer<typeof KeywordSchema>;
export type JobKeywords = z.infer<typeof JobKeywordsSchema>;
