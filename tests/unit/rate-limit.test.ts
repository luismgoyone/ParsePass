import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("rate limiting", () => {
  it("is off when Upstash isn't configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("KV_REST_API_URL", "");
    const { takeConversion } = await import("@/lib/rate-limit");
    expect(await takeConversion(new Request("http://test"))).toBeNull();
  });

  it("keys visitors by a hash of their IP, never the raw address", async () => {
    const { visitorKey } = await import("@/lib/rate-limit");
    const req = (ip: string) =>
      new Request("http://test", { headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } });
    expect(visitorKey(req("203.0.113.7"))).toMatch(/^[0-9a-f]{32}$/);
    expect(visitorKey(req("203.0.113.7"))).not.toContain("203");
    expect(visitorKey(req("203.0.113.7"))).toBe(visitorKey(req("203.0.113.7")));
    expect(visitorKey(req("203.0.113.8"))).not.toBe(visitorKey(req("203.0.113.7")));
  });

  it("reads the daily allowance from RATE_LIMIT_PER_DAY", async () => {
    vi.stubEnv("RATE_LIMIT_PER_DAY", "3");
    const { conversionsPerDay } = await import("@/lib/rate-limit");
    expect(conversionsPerDay()).toBe(3);
    vi.stubEnv("RATE_LIMIT_PER_DAY", "nope");
    expect(conversionsPerDay()).toBe(5);
  });
});
