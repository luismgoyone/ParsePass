import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

test("export the sample as an ATS-clean PDF and DOCX", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample resume" }).click();
  await expect(page.getByTestId("ats-score")).toHaveText(/Score: \d+\/100/);
  const before = await page.getByTestId("ats-score").textContent();

  await page.getByRole("button", { name: /Continue: structure with/ }).click();
  await expect(page).toHaveURL(/\/review$/);
  await page.getByRole("link", { name: "Continue to export" }).click();

  await expect(page).toHaveURL(/\/export$/);
  await expect(page.getByTestId("export-score")).toHaveText("ATS score: 100/100 (pass)");
  await expect(page.getByText(`was ${before!.replace("Score: ", "")}`)).toBeVisible();
  await expect(page.getByTestId("export-verification")).toHaveText(
    "Re-extracted text matches your edits exactly",
  );

  // The re-extracted view reads top to bottom: title, company and dates on their own lines.
  const atsView = page.getByRole("list", { name: "ATS view" });
  await expect(atsView).toContainText("Senior Software Engineer");
  await expect(atsView).toContainText("Brightline Health | Portland, OR");
  await expect(atsView).toContainText("Apr 2021 – Present");

  await expect(
    page.getByText("Converted the multi-column layout to a single column:"),
  ).toBeVisible();
  await expect(page.getByText("Kept your words:")).toBeVisible();

  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download PDF/ }).click();
  const pdfFile = await pdf;
  expect(pdfFile.suggestedFilename()).toBe("Jordan_Rivera_Resume.pdf");
  expect(
    readFileSync(await pdfFile.path())
      .subarray(0, 5)
      .toString(),
  ).toBe("%PDF-");

  const docx = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download DOCX/ }).click();
  const docxFile = await docx;
  expect(docxFile.suggestedFilename()).toBe("Jordan_Rivera_Resume.docx");
  // DOCX is a zip archive.
  expect(
    readFileSync(await docxFile.path())
      .subarray(0, 2)
      .toString(),
  ).toBe("PK");
});

test("edits made on the review screen are in the export", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample resume" }).click();
  await page.getByRole("button", { name: /Continue: structure with/ }).click();
  await page.getByLabel("Location").first().fill("Portland, OR");
  await page.getByRole("link", { name: "Continue to export" }).click();

  await expect(page.getByRole("list", { name: "ATS view" })).toContainText(
    "Portland, OR | jordan.rivera@example.com | +1 (415) 555-0142",
  );
  await expect(page.getByText("You edited 1 field:")).toBeVisible();
});
