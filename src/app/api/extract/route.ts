import { z } from "zod";

import { errorResponse, rateLimited, readJson } from "@/lib/api";
import { extractResume } from "@/lib/extraction";
import { takeConversion } from "@/lib/rate-limit";
import { checkHonesty } from "@/lib/resume/honesty";

const MAX_TEXT_CHARS = 40_000;

const RequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(50, "That's too little text to be a resume.")
    .max(MAX_TEXT_CHARS, "That resume is too long. Keep it under 40,000 characters."),
  links: z
    .array(z.object({ url: z.string().max(2000), text: z.string().max(500) }))
    .max(50)
    .default([]),
});

/** Structure resume text with the configured model, then check the result against the source. Stores nothing. */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === undefined)
    return Response.json({ error: "Send JSON: { text, links }." }, { status: 400 });
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  // Count only well-formed requests against the visitor's daily allowance.
  const quota = await takeConversion(request, "extract");
  if (quota && !quota.allowed) return rateLimited(quota, "conversions");

  const { text, links } = parsed.data;
  try {
    const { resume, model, usage } = await extractResume(text, links);
    const honesty = checkHonesty(resume, text);
    return Response.json({ resume, honesty, model, usage });
  } catch (error) {
    return errorResponse(error, "extract");
  }
}
