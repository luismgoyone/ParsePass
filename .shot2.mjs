import { chromium } from "@playwright/test";
const [out, file, width = "1280"] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +width, height: 900 } });
await p.goto("http://localhost:3200/");
if (file === "sample") await p.getByRole("button", { name: "Try a sample resume" }).click();
else await p.getByLabel("Resume file").setInputFiles(file);
await p.waitForURL(/diagnostic/);
await p
  .getByAltText(/Page 1/)
  .or(p.getByText("PAGE HEADER"))
  .first()
  .waitFor();
await p.getByRole("button", { name: "Show in ATS view" }).first().click();
await p.waitForTimeout(800);
await p.screenshot({ path: out, fullPage: true });
await b.close();
