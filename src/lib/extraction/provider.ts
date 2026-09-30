import { optionalEnv } from "@/lib/env";

export type ProviderId = "anthropic" | "gemini";

export const PROVIDERS: Record<ProviderId, { label: string; api: string; keyVar: string }> = {
  anthropic: { label: "Claude", api: "the Claude API", keyVar: "ANTHROPIC_API_KEY" },
  gemini: { label: "Gemini", api: "the Google Gemini API", keyVar: "GEMINI_API_KEY" },
};

/**
 * Which model provider structures resumes. EXTRACTION_PROVIDER picks one explicitly; otherwise
 * it's whichever key is set, preferring Claude. Null when neither is configured.
 */
export function activeProvider(): ProviderId | null {
  const chosen = optionalEnv("EXTRACTION_PROVIDER")?.toLowerCase();
  if (chosen === "anthropic" || chosen === "gemini") return chosen;
  if (optionalEnv("ANTHROPIC_API_KEY")) return "anthropic";
  if (optionalEnv("GEMINI_API_KEY")) return "gemini";
  return null;
}

export interface AiInfo {
  /** "Claude" or "Gemini". */
  label: string;
  /** One sentence for privacy notes: where resume text goes. */
  privacy: string;
}

/** What the UI should say about the model provider. Safe to call from server components. */
export function aiInfo(): AiInfo {
  const id = activeProvider() ?? "anthropic";
  const { label, api } = PROVIDERS[id];
  return {
    label,
    privacy:
      id === "gemini"
        ? `Resume text is sent to ${api} (free tier) to structure it. Google may use free-tier content to improve its products.`
        : `Resume text is sent only to ${api} to structure it.`,
  };
}

/** Display name for the UI ("Claude" when nothing is configured, since that's the default). */
export function providerLabel(): string {
  return PROVIDERS[activeProvider() ?? "anthropic"].label;
}
