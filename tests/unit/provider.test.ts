import { afterEach, describe, expect, it, vi } from "vitest";

import { activeProvider, providerLabel } from "@/lib/extraction/provider";

afterEach(() => vi.unstubAllEnvs());

const env = (vars: Record<string, string>) => {
  for (const k of ["EXTRACTION_PROVIDER", "ANTHROPIC_API_KEY", "GEMINI_API_KEY"])
    vi.stubEnv(k, vars[k] ?? "");
};

describe("activeProvider", () => {
  it("is null with no keys", () => {
    env({});
    expect(activeProvider()).toBeNull();
    expect(providerLabel()).toBe("Claude");
  });

  it("uses whichever key is set, preferring Claude", () => {
    env({ GEMINI_API_KEY: "g" });
    expect(activeProvider()).toBe("gemini");
    expect(providerLabel()).toBe("Gemini");
    env({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a" });
    expect(activeProvider()).toBe("anthropic");
  });

  it("honors EXTRACTION_PROVIDER", () => {
    env({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a", EXTRACTION_PROVIDER: "Gemini" });
    expect(activeProvider()).toBe("gemini");
  });
});
