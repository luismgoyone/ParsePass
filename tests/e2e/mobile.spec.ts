import { expect, test, type Page } from "@playwright/test";

/** Runs in the "mobile" project (Pixel 7 viewport, touch). */

async function expectNoHorizontalScroll(page: Page) {
  const { scroll, viewport } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(scroll, "page is wider than the screen").toBeLessThanOrEqual(viewport);
}

test("the whole flow fits a phone screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Choose your resume")).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: "Try a sample resume" }).click();
  await expect(page).toHaveURL(/\/diagnostic$/);
  await expect(page.getByAltText("Page 1 of the uploaded resume")).toBeVisible();
  // The step bar shows progress on phones.
  await expect(
    page.getByRole("navigation", { name: "Steps" }).getByRole("link", { name: /Diagnose/ }),
  ).toHaveAttribute("aria-current", "step");
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: /Continue: structure with/ }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByLabel("Company").first()).toHaveValue("Brightline Health");
  await expectNoHorizontalScroll(page);

  await page.getByRole("link", { name: "Continue to export" }).click();
  await expect(page.getByTestId("export-verification")).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("form fields use 16px text so iOS doesn't zoom on focus", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Paste plain text" }).click();
  const size = await page
    .getByPlaceholder("Paste your resume as plain text…")
    .evaluate((el) => getComputedStyle(el).fontSize);
  expect(size).toBe("16px");
});
