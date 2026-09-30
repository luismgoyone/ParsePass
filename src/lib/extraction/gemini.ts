import "server-only";

import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { optionalEnv, requireEnv } from "@/lib/env";
import { ResumeSchema } from "@/lib/resume/schema";

import { EXTRACTION_SYSTEM_PROMPT, extractionUserMessage } from "./prompt";
import { ExtractionError, type ExtractionResult, type Link } from "./types";

/**
 * A free-tier Gemini model with structured output. Checked against a new AI Studio key on
 * 2026-10-01: 2.5 models are closed to new users and newer Flash models have no free quota.
 * Override with GEMINI_MODEL when Google moves on.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const baseUrl = optionalEnv("GEMINI_BASE_URL"); // tests point this at a stub server
  client ??= new GoogleGenAI({
    apiKey: requireEnv("GEMINI_API_KEY"),
    ...(baseUrl ? { httpOptions: { baseUrl } } : {}),
  });
  return client;
}

/** JSON Schema for Gemini's structured output, from the same Zod schema Claude uses. */
function responseSchema() {
  const schema = z.toJSONSchema(ResumeSchema) as Record<string, unknown>;
  delete schema.$schema; // Gemini accepts the schema body, not the meta-schema pointer
  return schema;
}

/** Structure resume text with Gemini (structured JSON output), validated with Zod. */
export async function extractWithGemini(text: string, links: Link[]): Promise<ExtractionResult> {
  const model = optionalEnv("GEMINI_MODEL") ?? DEFAULT_GEMINI_MODEL;

  const request = () =>
    getClient().models.generateContent({
      model,
      contents: extractionUserMessage(text, links),
      config: {
        systemInstruction: EXTRACTION_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: responseSchema(),
        // Copying, not creative writing.
        temperature: 0,
        maxOutputTokens: 16000,
      },
    });

  let response;
  try {
    try {
      response = await request();
    } catch (error) {
      // Free-tier models return 503 "high demand" in short spikes; one retry usually clears it.
      if (!(error instanceof ApiError && error.status === 503)) throw error;
      await new Promise((r) => setTimeout(r, retryDelayMs()));
      response = await request();
    }
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("extract: Gemini API error", error.status);
      if (error.status === 503) {
        throw new ExtractionError("Gemini is overloaded right now. Try again in a minute.", 503);
      }
      if (error.status === 429) {
        throw new ExtractionError(
          "The free Gemini quota is used up for now. Try again in a minute.",
          503,
        );
      }
      if (error.status === 404) {
        throw new ExtractionError(
          `The Gemini model “${model}” isn't available. Set GEMINI_MODEL to a current model.`,
          503,
        );
      }
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        throw new ExtractionError("Gemini rejected the request. Check GEMINI_API_KEY.", 503);
      }
      throw new ExtractionError("Gemini couldn't structure this resume. Try again.", 502);
    }
    throw error;
  }

  const usage = {
    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
  };
  const finish = response.candidates?.[0]?.finishReason;
  // Log counts only, never resume text.
  console.info("extract: usage", JSON.stringify({ model, ...usage, finish }));

  if (finish === "MAX_TOKENS") {
    throw new ExtractionError(
      "This resume is too long to structure in one pass. Try a shorter version.",
      422,
    );
  }
  if (finish && finish !== "STOP") {
    throw new ExtractionError(
      "This text couldn't be processed. Make sure it's a resume and try again.",
      422,
    );
  }

  let json: unknown = null;
  try {
    json = JSON.parse(response.text ?? "");
  } catch {
    // handled below
  }
  const parsed = ResumeSchema.safeParse(json);
  if (!parsed.success) {
    console.error("extract: Gemini output failed schema validation");
    throw new ExtractionError("Gemini returned an unexpected result. Try again.", 502);
  }
  return { resume: parsed.data, model, usage };
}

function retryDelayMs(): number {
  return Number(optionalEnv("GEMINI_RETRY_DELAY_MS") ?? 2000);
}
