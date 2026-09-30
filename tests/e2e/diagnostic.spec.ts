import { expect, test } from "@playwright/test";

const fixture = (name: string) => `tests/fixtures/${name}`;

test("sample two-column PDF shows the scrambled ATS view and its issues", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample resume" }).click();

  await expect(page).toHaveURL(/\/diagnostic$/);
  await expect(page.getByText(/ATS parsing issues? found/)).toBeVisible();
  await expect(page.getByTestId("ats-score")).toHaveText(/Score: \d+\/100/);
  await expect(page.getByRole("heading", { name: "2-column layout" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ambiguous date format" })).toBeVisible();

  const atsView = page.getByRole("list", { name: "ATS view" });
  await expect(atsView).toContainText("AWS Senior Software Engineer 04/21 – Present");

  // The source preview renders the PDF with the detected column break drawn on it.
  await expect(page.getByAltText("Page 1 of the uploaded resume")).toBeVisible();
  await expect(page.getByText("LAY-01 · parser reads straight across")).toBeVisible();

  await page.getByRole("button", { name: "Show in ATS view" }).first().click();
  await expect(page.getByRole("button", { name: "Hide" })).toBeVisible();
});

test("DOCX upload flags header contact details and a table", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Resume file").setInputFiles(fixture("issues.docx"));

  await expect(page).toHaveURL(/\/diagnostic$/);
  await expect(page.getByRole("heading", { name: "Content inside a table" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Contact details in the page header" }),
  ).toBeVisible();
  await expect(page.getByText("PAGE HEADER · skipped by most ATS")).toBeVisible();
});

test("a clean PDF passes with no issues", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Resume file").setInputFiles(fixture("clean.pdf"));
  await expect(page.getByText("No parsing issues found.")).toBeVisible();
  await expect(page.getByTestId("ats-score")).toHaveText("Score: 100/100");
});

test("an image-only PDF is flagged as unreadable", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Resume file").setInputFiles(fixture("image-only.pdf"));
  await expect(page.getByRole("heading", { name: "No selectable text" })).toBeVisible();
  await expect(page.getByText("No selectable text. An ATS sees an empty resume.")).toBeVisible();
});

test("pasted text is checked for content issues", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Paste plain text" }).click();
  await page
    .getByPlaceholder("Paste your resume as plain text…")
    .fill("Jordan Rivera\nMy Journey\nEngineer at Acme");
  await page.getByRole("button", { name: "Check this text" }).click();
  await expect(page).toHaveURL(/\/diagnostic$/);
  await expect(page.getByRole("heading", { name: /Missing sections/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No email address found" })).toBeVisible();
});

test("unsupported files get a clear error", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Resume file").setInputFiles({
    name: "resume.doc",
    mimeType: "application/msword",
    buffer: Buffer.from("x"),
  });
  // Next.js's route announcer is also role="alert", so match ours by its text.
  await expect(
    page.getByRole("alert").filter({ hasText: "Old .doc files aren't supported" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("the diagnostic page asks for an upload when there is nothing to show", async ({ page }) => {
  await page.goto("/diagnostic");
  await expect(page.getByText("Upload a resume first")).toBeVisible();
});

test("files over 5 MB are rejected before extraction", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Resume file").setInputFiles({
    name: "huge.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole("alert").filter({ hasText: "over 5 MB" })).toBeVisible();
});

test("a damaged PDF gets a readable error", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Resume file").setInputFiles({
    name: "broken.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7 not really"),
  });
  await expect(page.getByRole("alert").filter({ hasText: "couldn't read that PDF" })).toBeVisible();
});

test("unknown routes show a 404 page", async ({ page }) => {
  await page.goto("/nope");
  await expect(page.getByRole("heading", { name: "This page doesn't exist." })).toBeVisible();
});
