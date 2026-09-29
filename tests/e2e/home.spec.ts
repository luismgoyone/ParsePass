import { expect, test } from "@playwright/test";

test("home page shows the hero and the upload panel", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("actually reads");
  await expect(page.getByText("Drag and drop your resume")).toBeVisible();
  await expect(page.getByText(/never stored/)).toBeVisible();
});
