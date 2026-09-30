/**
 * A stand-in for the Claude Messages API so e2e tests never call the real API.
 * It answers /v1/messages with a structured-output message holding a canned resume:
 * the sample resume for the sample file, and one with an invented employer for anything
 * else (so the honesty check has something to catch).
 */
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const port = Number(process.env.MOCK_ANTHROPIC_PORT ?? 4011);
const jordan = readFileSync(new URL("../../fixtures/jordan-resume.json", import.meta.url), "utf8");

const invented = JSON.stringify({
  contact: {
    name: "Sam Lee",
    headline: "",
    email: "sam@example.com",
    phone: "",
    location: "",
    links: [],
  },
  summary: "",
  experience: [
    {
      title: "Engineer",
      company: "Acme",
      location: "",
      start: "Mar 2020",
      end: "Present",
      bullets: [],
    },
    // Not in the source text: the honesty check must flag this.
    {
      title: "Staff Engineer",
      company: "Initech",
      location: "",
      start: "2015",
      end: "2019",
      bullets: [],
    },
  ],
  education: [],
  skills: [{ category: "Skills", items: ["TypeScript"] }],
  projects: [],
  certifications: [],
});

createServer((req, res) => {
  if (req.url === "/health") return void res.end("ok");
  if (req.method !== "POST" || !req.url?.startsWith("/v1/messages")) {
    res.writeHead(404).end();
    return;
  }
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const request = JSON.parse(body) as { model: string; messages: { content: string }[] };
    const text = String(request.messages[0]?.content ?? "");
    if (text.includes("MOCK_FAIL")) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(
        JSON.stringify({ type: "error", error: { type: "api_error", message: "mock failure" } }),
      );
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        id: "msg_mock",
        type: "message",
        role: "assistant",
        model: request.model,
        content: [{ type: "text", text: text.includes("JORDAN RIVERA") ? jordan : invented }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 1200, output_tokens: 600 },
      }),
    );
  });
}).listen(port, () => console.log(`mock Anthropic API on :${port}`));
