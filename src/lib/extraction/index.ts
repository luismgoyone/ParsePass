import "server-only";

import type { z } from "zod";

import { extractWithClaude, generateWithClaude } from "./anthropic";
import { extractWithGemini, generateWithGemini } from "./gemini";
import { activeProvider } from "./provider";
import {
  ExtractionError,
  type ExtractionResult,
  type GenerateRequest,
  type GenerateResult,
  type Link,
} from "./types";

export { ExtractionError } from "./types";

const NOT_CONFIGURED =
  "AI isn't configured on this server (set ANTHROPIC_API_KEY or GEMINI_API_KEY).";

/** Structure resume text with whichever provider is configured (see provider.ts). */
export async function extractResume(text: string, links: Link[]): Promise<ExtractionResult> {
  const provider = activeProvider();
  if (provider === "anthropic") return extractWithClaude(text, links);
  if (provider === "gemini") return extractWithGemini(text, links);
  throw new ExtractionError(NOT_CONFIGURED, 503);
}

/** Any other structured call (keywords, bullet suggestions) with the configured provider. */
export async function generate<T extends z.ZodType>(
  req: GenerateRequest<T>,
): Promise<GenerateResult<z.infer<T>>> {
  const provider = activeProvider();
  if (provider === "anthropic") return generateWithClaude(req);
  if (provider === "gemini") return generateWithGemini(req);
  throw new ExtractionError(NOT_CONFIGURED, 503);
}
