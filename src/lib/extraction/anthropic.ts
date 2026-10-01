import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

import { optionalEnv } from "@/lib/env";
import { ResumeSchema } from "@/lib/resume/schema";

import { EXTRACTION_SYSTEM_PROMPT, extractionUserMessage } from "./prompt";
import {
  ExtractionError,
  type ExtractionResult,
  type GenerateRequest,
  type GenerateResult,
  type Link,
} from "./types";

/** The spec calls for a current Sonnet model. Override with ANTHROPIC_MODEL. */
export const DEFAULT_MODEL = "claude-sonnet-5-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // Reads ANTHROPIC_API_KEY (and ANTHROPIC_BASE_URL, used by e2e tests) at first call.
  client ??= new Anthropic();
  return client;
}

/**
 * One structured call to Claude. Structured outputs constrain the response to the schema's JSON
 * schema; we still validate it with Zod before use.
 */
export async function generateWithClaude<T extends z.ZodType>(
  req: GenerateRequest<T>,
): Promise<GenerateResult<z.infer<T>>> {
  if (!optionalEnv("ANTHROPIC_API_KEY")) {
    throw new ExtractionError(
      "AI isn't configured on this server (missing ANTHROPIC_API_KEY).",
      503,
    );
  }
  const model = optionalEnv("ANTHROPIC_MODEL") ?? DEFAULT_MODEL;

  let response;
  try {
    response = await getClient().beta.messages.create({
      model,
      max_tokens: req.maxTokens ?? 16000,
      // Careful copying and light rewriting, not deep reasoning: medium effort keeps it fast.
      output_config: { effort: "medium", format: betaZodOutputFormat(req.schema) },
      // If a safety classifier declines, the API retries on a suitable fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    });
  } catch (error) {
    if (
      error instanceof Anthropic.RateLimitError ||
      error instanceof Anthropic.InternalServerError
    ) {
      throw new ExtractionError("Claude is busy right now. Try again in a minute.", 503);
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`${req.task}: Claude API error`, error.status, error.name);
      throw new ExtractionError(`Claude couldn't ${req.action}. Try again.`, 502);
    }
    throw error;
  }

  const usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
  // Log counts only, never resume text.
  console.info(
    `${req.task}: usage`,
    JSON.stringify({ model: response.model, ...usage, stop: response.stop_reason }),
  );

  if (response.stop_reason === "refusal") {
    throw new ExtractionError(`This text couldn't be processed. ${req.refusalHint}`, 422);
  }
  if (response.stop_reason === "max_tokens") {
    throw new ExtractionError(
      "This is too long to process in one pass. Try a shorter version.",
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
  const parsed = req.schema.safeParse(json);
  if (!parsed.success) {
    console.error(`${req.task}: output failed schema validation`);
    throw new ExtractionError("Claude returned an unexpected result. Try again.", 502);
  }
  return { data: parsed.data, model: response.model, usage };
}

export async function extractWithClaude(text: string, links: Link[]): Promise<ExtractionResult> {
  const { data, model, usage } = await generateWithClaude({
    task: "extract",
    action: "structure this resume",
    refusalHint: "Make sure it's a resume and try again.",
    schema: ResumeSchema,
    system: EXTRACTION_SYSTEM_PROMPT,
    user: extractionUserMessage(text, links),
  });
  return { resume: data, model, usage };
}
