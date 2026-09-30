/**
 * Record the README demo: screenshots of each screen and a GIF of the whole flow.
 * Needs a production build and ffmpeg. Uses the mock Claude API, so it costs nothing.
 *
 *   pnpm build && pnpm demo
 */
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

const OUT = join(process.cwd(), "docs/demo");
const PORT = 3300;
const MOCK_PORT = 4012;
const url = `http://localhost:${PORT}`;

mkdirSync(OUT, { recursive: true });
const mock = spawn("node", ["tests/e2e/support/mock-anthropic.mts"], {
  env: { ...process.env, MOCK_ANTHROPIC_PORT: String(MOCK_PORT) },
});
const app = spawn("pnpm", ["start", "--port", String(PORT)], {
  env: {
    ...process.env,
    ANTHROPIC_API_KEY: "demo",
    ANTHROPIC_BASE_URL: `http://localhost:${MOCK_PORT}`,
    UPSTASH_REDIS_REST_URL: "",
    KV_REST_API_URL: "",
  },
});

try {
  for (let i = 0; i < 60; i++) {
    if (
      await fetch(url)
        .then((r) => r.ok)
        .catch(() => false)
    )
      break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const browser = await chromium.launch();
  const videoDir = join(OUT, "tmp-video");
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();
  const pause = (ms = 1400) => page.waitForTimeout(ms);
  const shot = (name: string) => page.screenshot({ path: join(OUT, `${name}.png`) });

  await page.goto(url);
  await pause();
  await shot("1-upload");
  await page.getByRole("button", { name: "Try a sample resume" }).scrollIntoViewIfNeeded();
  await pause(800);
  await page.getByRole("button", { name: "Try a sample resume" }).click();
  await page.getByAltText("Page 1 of the uploaded resume").waitFor();
  await pause();
  await shot("2-diagnostic");
  await page.getByRole("button", { name: "Show in ATS view" }).first().click();
  await pause(2000);

  await page.getByRole("button", { name: /Continue: structure with Claude/ }).click();
  await page.waitForURL(/review/);
  await pause();
  await shot("3-review");
  await page.mouse.wheel(0, 700);
  await pause();

  await page.getByRole("link", { name: "Continue to export" }).click();
  await page.getByTestId("export-verification").waitFor();
  await page.getByAltText("Page 1 of the uploaded resume").waitFor();
  await pause();
  await shot("4-export");
  await page.mouse.wheel(0, 900);
  await pause(2000);

  await context.close();
  await browser.close();

  const [video] = readdirSync(videoDir);
  renameSync(join(videoDir, video), join(OUT, "demo.webm"));
  rmSync(videoDir, { recursive: true });
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    join(OUT, "demo.webm"),
    "-vf",
    "fps=8,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer",
    join(OUT, "demo.gif"),
  ]);
  console.log(`Wrote screenshots, demo.webm and demo.gif to ${OUT}`);
} finally {
  app.kill();
  mock.kill();
}
