import { z } from "zod";

import { errorResponse, rateLimited, readJson } from "@/lib/api";
import { generate } from "@/lib/extraction";
import { KEYWORDS_SYSTEM_PROMPT, keywordsUserMessage } from "@/lib/jobs/prompt";
import { JobKeywordsSchema } from "@/lib/jobs/schema";
import { takeConversion } from "@/lib/rate-limit";

const RequestSchema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(80, "Paste the full job description: that's too short to read keywords from.")
    .max(20_000, "That job description is too long. Keep it under 20,000 characters."),
});

/** List the keywords a job posting asks for. Matching against the resume happens in the browser. */
export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const quota = await takeConversion(request, "assist");
  if (quota && !quota.allowed) return rateLimited(quota, "keyword checks and suggestions");

  try {
    const { data, model } = await generate({
      task: "keywords",
      action: "read this job description",
      refusalHint: "Make sure it's a job description and try again.",
      schema: JobKeywordsSchema,
      system: KEYWORDS_SYSTEM_PROMPT,
      user: keywordsUserMessage(parsed.data.jobDescription),
      maxTokens: 4000,
    });
    // Drop blanks and duplicates the model may return.
    const seen = new Set<string>();
    const keywords = data.keywords
      .map((k) => ({
        ...k,
        term: k.term.trim(),
        aliases: k.aliases.map((a) => a.trim()).filter(Boolean),
      }))
      .filter((k) => k.term && !seen.has(k.term.toLowerCase()) && seen.add(k.term.toLowerCase()))
      .slice(0, 30);
    return Response.json({ role: data.role, keywords, model });
  } catch (error) {
    return errorResponse(error, "keywords");
  }
}
