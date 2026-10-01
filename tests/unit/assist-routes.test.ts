import { beforeEach, describe, expect, it, vi } from "vitest";

const takeConversion = vi.fn();
const generate = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  takeConversion: (r: Request, bucket: string) => takeConversion(r, bucket),
}));
vi.mock("@/lib/extraction", async (original) => ({
  ...(await original<typeof import("@/lib/extraction")>()),
  generate: (req: unknown) => generate(req),
}));

const keywords = await import("@/app/api/keywords/route");
const suggest = await import("@/app/api/suggest/route");

const post = (route: { POST: (r: Request) => Promise<Response> }, body: unknown) =>
  route.POST(new Request("http://test", { method: "POST", body: JSON.stringify(body) }));

const JOB =
  "Senior Frontend Engineer. TypeScript, React and Next.js required. GraphQL is a plus. ".repeat(2);
const SOURCE =
  "Led the rebuild of the patient portal in Next.js, cutting load time by 40%. Skills: React, AWS.";

beforeEach(() => {
  takeConversion.mockReset().mockResolvedValue(null);
  generate.mockReset();
});

describe("POST /api/keywords", () => {
  it("returns cleaned, de-duplicated keywords", async () => {
    generate.mockResolvedValue({
      model: "m",
      data: {
        role: "Frontend Engineer",
        keywords: [
          { term: " TypeScript ", aliases: ["TS", " "], kind: "skill", importance: "required" },
          { term: "typescript", aliases: [], kind: "skill", importance: "required" },
          { term: "", aliases: [], kind: "skill", importance: "required" },
        ],
      },
    });
    const res = await post(keywords, { jobDescription: JOB });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.keywords).toEqual([
      { term: "TypeScript", aliases: ["TS"], kind: "skill", importance: "required" },
    ]);
    expect(takeConversion).toHaveBeenCalledWith(expect.any(Request), "assist");
  });

  it("rejects a too-short job description without spending quota", async () => {
    expect((await post(keywords, { jobDescription: "Engineer" })).status).toBe(400);
    expect(takeConversion).not.toHaveBeenCalled();
  });

  it("returns 429 when the assist allowance is used", async () => {
    takeConversion.mockResolvedValue({
      allowed: false,
      limit: 20,
      remaining: 0,
      reset: Date.now() + 60_000,
    });
    const res = await post(keywords, { jobDescription: JOB });
    expect(res.status).toBe(429);
    expect((await res.json()).error).toContain("20 free keyword checks and suggestions");
  });
});

describe("POST /api/suggest", () => {
  const request = {
    title: "Senior Software Engineer",
    company: "Brightline Health",
    bullets: [
      "Led the rebuild of the patient portal in Next.js, cutting load time by 40%.",
      "Owned the billing API.",
    ],
    resumeSource: SOURCE,
  };

  it("keeps honest rewrites and discards ones that add facts", async () => {
    generate.mockResolvedValue({
      model: "m",
      data: {
        suggestions: [
          {
            index: 0,
            text: "Rebuilt the patient portal in Next.js, cutting load time by 40%.",
            reason: "Stronger verb",
          },
          {
            index: 1,
            text: "Owned the billing API serving 3 million users.",
            reason: "Adds scope",
          },
          { index: 1, text: "Owned the billing API on Kubernetes.", reason: "Adds tool" },
          { index: 7, text: "Out of range.", reason: "" },
        ],
      },
    });
    const res = await post(suggest, request);
    const body = await res.json();
    expect(body.suggestions).toEqual([
      {
        index: 0,
        original: request.bullets[0],
        text: "Rebuilt the patient portal in Next.js, cutting load time by 40%.",
        reason: "Stronger verb",
      },
    ]);
    expect(body.discarded).toBe(2);
  });

  it("requires at least one bullet", async () => {
    expect((await post(suggest, { ...request, bullets: [] })).status).toBe(400);
  });
});
