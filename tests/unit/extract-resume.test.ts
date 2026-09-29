import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import jordan from "../fixtures/jordan-resume.json";

/** A tiny stand-in for the Messages API that records requests and returns a canned reply. */
let server: Server;
let reply: { status: number; body: unknown };
let lastRequest: Record<string, unknown> | null = null;

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      lastRequest = { url: req.url, headers: req.headers, ...JSON.parse(body) };
      res
        .writeHead(reply.status, { "content-type": "application/json" })
        .end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  vi.stubEnv("ANTHROPIC_BASE_URL", `http://localhost:${(server.address() as AddressInfo).port}`);
  vi.stubEnv("ANTHROPIC_API_KEY", "test");
});

afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

const message = (text: string, stop_reason = "end_turn") => ({
  id: "msg_test",
  type: "message",
  role: "assistant",
  model: "claude-sonnet-5-5",
  content: [{ type: "text", text }],
  stop_reason,
  stop_sequence: null,
  usage: { input_tokens: 1000, output_tokens: 500 },
});

beforeEach(() => {
  reply = { status: 200, body: message(JSON.stringify(jordan)) };
  lastRequest = null;
});

describe("extractResume", () => {
  it("returns the validated resume and token usage", async () => {
    const { extractResume } = await import("@/lib/claude/extract-resume");
    const result = await extractResume("JORDAN RIVERA ...", [
      { url: "https://x.dev", text: "Site" },
    ]);
    expect(result.resume.experience[0].company).toBe("Brightline Health");
    expect(result.usage).toEqual({ inputTokens: 1000, outputTokens: 500 });
  });

  it("asks a Sonnet model for schema-constrained output with refusal fallbacks", async () => {
    const { extractResume } = await import("@/lib/claude/extract-resume");
    await extractResume("JORDAN RIVERA ...", [{ url: "https://x.dev", text: "Site" }]);
    expect(lastRequest).toMatchObject({ model: "claude-sonnet-5-5", fallbacks: "default" });
    const config = lastRequest!.output_config as { format: { type: string; schema: object } };
    expect(config.format.type).toBe("json_schema");
    expect((lastRequest!.headers as Record<string, string>)["anthropic-beta"]).toContain(
      "server-side-fallback-2026-07-01",
    );
    const content = (lastRequest!.messages as { content: string }[])[0].content;
    expect(content).toContain("<hyperlinks>\nSite -> https://x.dev");
  });

  it("rejects output that doesn't match the schema", async () => {
    reply = { status: 200, body: message(JSON.stringify({ contact: {} })) };
    const { extractResume } = await import("@/lib/claude/extract-resume");
    await expect(extractResume("text", [])).rejects.toMatchObject({ status: 502 });
  });

  it("turns a refusal into a 422", async () => {
    reply = { status: 200, body: message("", "refusal") };
    const { extractResume } = await import("@/lib/claude/extract-resume");
    await expect(extractResume("text", [])).rejects.toMatchObject({ status: 422 });
  });

  it("reports a missing API key as not configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { extractResume } = await import("@/lib/claude/extract-resume");
    await expect(extractResume("text", [])).rejects.toMatchObject({ status: 503 });
    vi.stubEnv("ANTHROPIC_API_KEY", "test");
  });
});
