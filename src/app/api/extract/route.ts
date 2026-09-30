import { z } from "zod";

import { extractResume, ExtractionError } from "@/lib/claude/extract-resume";
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

/** Structure resume text with Claude, then check the result against the source. Stores nothing. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send JSON: { text, links }." }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  // Count only well-formed requests against the visitor's daily allowance.
  const quota = await takeConversion(request);
  if (quota && !quota.allowed) {
    const retryAfter = Math.max(1, Math.ceil((quota.reset - Date.now()) / 1000));
    return Response.json(
      {
        error: `You've used today's ${quota.limit} free conversions. Try again in ${formatWait(retryAfter)}.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const { text, links } = parsed.data;
  try {
    const { resume, model, usage } = await extractResume(text, links);
    const honesty = checkHonesty(resume, text);
    return Response.json({ resume, honesty, model, usage });
  } catch (error) {
    if (error instanceof ExtractionError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("extract: unexpected error", error instanceof Error ? error.name : typeof error);
    return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}

function formatWait(seconds: number): string {
  const hours = Math.round(seconds / 3600);
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
