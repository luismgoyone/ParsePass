import { beforeEach, describe, expect, it, vi } from "vitest";

import jordan from "../fixtures/jordan-resume.json";

const takeConversion = vi.fn();
const extractResume = vi.fn();

vi.mock("@/lib/rate-limit", () => ({ takeConversion: (r: Request) => takeConversion(r) }));
vi.mock("@/lib/extraction", async (original) => ({
  ...(await original<typeof import("@/lib/extraction")>()),
  extractResume: (text: string, links: unknown) => extractResume(text, links),
}));

const { POST } = await import("@/app/api/extract/route");
const { ExtractionError } = await import("@/lib/extraction");

const TEXT =
  "JORDAN RIVERA\njordan.rivera@example.com\nSenior Software Engineer at Brightline Health, 04/21 – Present";
const post = (body: unknown) =>
  POST(
    new Request("http://test/api/extract", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  takeConversion.mockReset().mockResolvedValue(null);
  extractResume.mockReset().mockResolvedValue({
    resume: jordan,
    model: "claude-sonnet-5-5",
    usage: { inputTokens: 1, outputTokens: 1 },
  });
});

describe("POST /api/extract", () => {
  it("returns the resume with an honesty report", async () => {
    const res = await post({ text: TEXT });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resume.contact.name).toBe("JORDAN RIVERA");
    expect(body.honesty.flags.length).toBeGreaterThan(0); // the stub resume has far more than TEXT
  });

  it("rejects bad input without spending quota", async () => {
    expect((await post("not json")).status).toBe(400);
    expect((await post({ text: "too short" })).status).toBe(400);
    expect((await post({ text: "x".repeat(40_001) })).status).toBe(400);
    expect(takeConversion).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when the daily allowance is used", async () => {
    takeConversion.mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 3 * 3600_000,
    });
    const res = await post({ text: TEXT });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect((await res.json()).error).toBe(
      "You've used today's 5 free conversions. Try again in 3 hours.",
    );
    expect(extractResume).not.toHaveBeenCalled();
  });

  it("passes extraction errors through with their status", async () => {
    extractResume.mockRejectedValue(
      new ExtractionError("Claude is busy right now. Try again in a minute.", 503),
    );
    const res = await post({ text: TEXT });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("busy");
  });
});
