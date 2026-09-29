import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import jordan from "../fixtures/jordan-resume.json";

/** A stand-in for the Gemini generateContent endpoint. */
let server: Server;
let reply: { status: number; body: unknown };
let last: { url?: string; body: Record<string, unknown> } | null = null;

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      last = { url: req.url, body: JSON.parse(body) };
      res
        .writeHead(reply.status, { "content-type": "application/json" })
        .end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  vi.stubEnv("GEMINI_BASE_URL", `http://localhost:${(server.address() as AddressInfo).port}`);
  vi.stubEnv("GEMINI_API_KEY", "test");
  vi.stubEnv("GEMINI_MODEL", "");
});

afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

const ok = (text: string, finishReason = "STOP") => ({
  status: 200,
  body: {
    candidates: [{ content: { role: "model", parts: [{ text }] }, finishReason }],
    usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 400 },
  },
});

beforeEach(() => {
  reply = ok(JSON.stringify(jordan));
  last = null;
});

describe("extractWithGemini", () => {
  it("returns the validated resume and token usage", async () => {
    const { extractWithGemini } = await import("@/lib/extraction/gemini");
    const result = await extractWithGemini("JORDAN RIVERA ...", []);
    expect(result.resume.experience[1].company).toBe("Cascade Commerce");
    expect(result).toMatchObject({
      model: "gemini-2.5-flash",
      usage: { inputTokens: 900, outputTokens: 400 },
    });
  });

  it("sends the shared prompt and a JSON schema built from the Zod schema", async () => {
    const { extractWithGemini } = await import("@/lib/extraction/gemini");
    await extractWithGemini("JORDAN RIVERA ...", [{ url: "https://x.dev", text: "Site" }]);
    expect(last?.url).toContain("gemini-2.5-flash:generateContent");
    const config = last!.body.generationConfig as Record<string, unknown>;
    expect(config.responseMimeType).toBe("application/json");
    expect(config.temperature).toBe(0);
    const schema = config.responseJsonSchema as {
      properties: Record<string, unknown>;
      $schema?: string;
    };
    expect(Object.keys(schema.properties)).toEqual([
      "contact",
      "summary",
      "experience",
      "education",
      "skills",
      "projects",
      "certifications",
    ]);
    expect(schema.$schema).toBeUndefined();
    expect(JSON.stringify(last!.body.systemInstruction)).toContain(
      "Never add anything that isn't in the text",
    );
    expect(JSON.stringify(last!.body.contents)).toContain("Site -> https://x.dev");
  });

  it("rejects output that doesn't match the schema", async () => {
    reply = ok('{"contact":{}}');
    const { extractWithGemini } = await import("@/lib/extraction/gemini");
    await expect(extractWithGemini("text", [])).rejects.toMatchObject({ status: 502 });
  });

  it("reports a used-up free quota clearly", async () => {
    reply = {
      status: 429,
      body: { error: { code: 429, message: "quota", status: "RESOURCE_EXHAUSTED" } },
    };
    const { extractWithGemini } = await import("@/lib/extraction/gemini");
    await expect(extractWithGemini("text", [])).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining("free Gemini quota"),
    });
  });

  it("names the model when it doesn't exist", async () => {
    reply = {
      status: 404,
      body: { error: { code: 404, message: "not found", status: "NOT_FOUND" } },
    };
    const { extractWithGemini } = await import("@/lib/extraction/gemini");
    await expect(extractWithGemini("text", [])).rejects.toMatchObject({
      message: expect.stringContaining("GEMINI_MODEL"),
    });
  });

  it("treats a safety block as unprocessable", async () => {
    reply = ok("", "SAFETY");
    const { extractWithGemini } = await import("@/lib/extraction/gemini");
    await expect(extractWithGemini("text", [])).rejects.toMatchObject({ status: 422 });
  });
});
