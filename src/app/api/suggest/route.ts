import { z } from "zod";

import { errorResponse, rateLimited, readJson } from "@/lib/api";
import { generate } from "@/lib/extraction";
import { takeConversion } from "@/lib/rate-limit";
import { checkSuggestion } from "@/lib/suggest/check";
import { SUGGEST_SYSTEM_PROMPT, suggestUserMessage } from "@/lib/suggest/prompt";
import { SuggestionsSchema } from "@/lib/suggest/schema";

const RequestSchema = z.object({
  title: z.string().max(200),
  company: z.string().max(200),
  current: z.boolean().default(false),
  bullets: z.array(z.string().max(1000)).min(1, "Add a bullet first.").max(20),
  jobDescription: z.string().max(20_000).optional(),
  /** The resume's original text: suggestions may only use facts from it. */
  resumeSource: z.string().max(60_000),
});

/** Suggest clearer wording for one role's bullets. Anything that adds facts is discarded here. */
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

  const input = parsed.data;
  try {
    const { data, model } = await generate({
      task: "suggest",
      action: "suggest wording for these bullets",
      refusalHint: "Try again with different bullets.",
      schema: SuggestionsSchema,
      system: SUGGEST_SYSTEM_PROMPT,
      user: suggestUserMessage({
        ...input,
        jobDescription: input.jobDescription?.trim() || undefined,
      }),
      maxTokens: 4000,
    });
    const suggestions = [];
    let discarded = 0;
    for (const s of data.suggestions) {
      const original = input.bullets[s.index];
      if (original === undefined) continue;
      const verdict = checkSuggestion(original, s.text, input.resumeSource);
      if (verdict.ok)
        suggestions.push({ index: s.index, original, text: s.text.trim(), reason: s.reason });
      else if (verdict.reason !== "unchanged") discarded++;
    }
    return Response.json({ suggestions, discarded, model });
  } catch (error) {
    return errorResponse(error, "suggest");
  }
}
