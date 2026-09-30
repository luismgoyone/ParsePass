import "server-only";

import { extractWithClaude } from "./anthropic";
import { extractWithGemini } from "./gemini";
import { activeProvider } from "./provider";
import { ExtractionError, type ExtractionResult, type Link } from "./types";

export { ExtractionError } from "./types";

/** Structure resume text with whichever provider is configured (see provider.ts). */
export async function extractResume(text: string, links: Link[]): Promise<ExtractionResult> {
  const provider = activeProvider();
  if (provider === "anthropic") return extractWithClaude(text, links);
  if (provider === "gemini") return extractWithGemini(text, links);
  throw new ExtractionError(
    "Extraction isn't configured on this server (set ANTHROPIC_API_KEY or GEMINI_API_KEY).",
    503,
  );
}
