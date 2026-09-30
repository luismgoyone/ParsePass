import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { optionalEnv } from "@/lib/env";
import { ResumeSchema, type Resume } from "@/lib/resume/schema";

import { EXTRACTION_SYSTEM_PROMPT, extractionUserMessage } from "./prompt";

/** The spec calls for a current Sonnet model for extraction. Override with ANTHROPIC_MODEL. */
export const DEFAULT_MODEL = "claude-sonnet-5-5";

export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

export interface ExtractionResult {
  resume: Resume;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // Reads ANTHROPIC_API_KEY (and ANTHROPIC_BASE_URL, used by e2e tests) at first call.
  client ??= new Anthropic();
  return client;
}

/**
 * Structure resume text with Claude. Structured outputs constrain the response to
 * ResumeSchema's JSON schema; we still validate it with Zod before use.
 */
export async function extractResume(
  text: string,
  links: { url: string; text: string }[],
): Promise<ExtractionResult> {
  if (!optionalEnv("ANTHROPIC_API_KEY")) {
    throw new ExtractionError(
      "Extraction isn't configured on this server (missing ANTHROPIC_API_KEY).",
      503,
    );
  }
  const model = optionalEnv("ANTHROPIC_MODEL") ?? DEFAULT_MODEL;

  let response;
  try {
    response = await getClient().beta.messages.create({
      model,
      max_tokens: 16000,
      // Extraction is careful copying, not deep reasoning: medium effort keeps it fast.
      output_config: { effort: "medium", format: betaZodOutputFormat(ResumeSchema) },
      // If a safety classifier declines, the API retries on a suitable fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: extractionUserMessage(text, links) }],
    });
  } catch (error) {
    if (
      error instanceof Anthropic.RateLimitError ||
      error instanceof Anthropic.InternalServerError
    ) {
      throw new ExtractionError("Claude is busy right now. Try again in a minute.", 503);
    }
    if (error instanceof Anthropic.APIError) {
      console.error("extract: Claude API error", error.status, error.name);
      throw new ExtractionError("Claude couldn't structure this resume. Try again.", 502);
    }
    throw error;
  }

  const usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
  // Log counts only, never resume text.
  console.info(
    "extract: usage",
    JSON.stringify({ model: response.model, ...usage, stop: response.stop_reason }),
  );

  if (response.stop_reason === "refusal") {
    throw new ExtractionError(
      "This text couldn't be processed. Make sure it's a resume and try again.",
      422,
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new ExtractionError(
      "This resume is too long to structure in one pass. Try a shorter version.",
      422,
    );
  }

  const output = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let json: unknown;
  try {
    json = JSON.parse(output);
  } catch {
    json = null;
  }
  const parsed = ResumeSchema.safeParse(json);
  if (!parsed.success) {
    console.error("extract: output failed schema validation");
    throw new ExtractionError("Claude returned an unexpected result. Try again.", 502);
  }
  return { resume: parsed.data, model: response.model, usage };
}
