import { expect, test } from "@playwright/test";

test("structure the sample with Claude, then edit fields", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample resume" }).click();
  await expect(page).toHaveURL(/\/diagnostic$/);

  await page.getByRole("button", { name: /Continue: structure with/ }).click();
  await expect(page).toHaveURL(/\/review$/);

  await expect(page.getByText("Honesty check: nothing added")).toBeVisible();
  await expect(page.getByLabel("Company").first()).toHaveValue("Brightline Health");
  await expect(page.getByText("Exports as “Apr 2021 – Present”")).toBeVisible();

  // Adding a skill the resume never listed is flagged, not silently accepted.
  await page.getByLabel("Add skills to Skills").fill("Kubernetes");
  await page.getByLabel("Add skills to Skills").press("Enter");
  await expect(page.getByText("Honesty check: 1 item to review")).toBeVisible();
  await expect(page.getByRole("button", { name: "skill: “Kubernetes”" })).toBeVisible();

  // Removing it clears the flag; reverting restores the model's extraction.
  await page.getByRole("button", { name: "Remove Kubernetes" }).click();
  await expect(page.getByText("Honesty check: nothing added")).toBeVisible();
  await page.getByLabel("Company").first().fill("Brightline");
  await page.getByRole("button", { name: /Revert to .+'s extraction/ }).click();
  await expect(page.getByLabel("Company").first()).toHaveValue("Brightline Health");
});

test("an invented employer from the model is flagged", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Paste plain text" }).click();
  await page
    .getByPlaceholder("Paste your resume as plain text…")
    .fill(
      "Sam Lee\nsam@example.com\nExperience\nEngineer\nAcme\nMar 2020 – Present\nSkills\nTypeScript",
    );
  await page.getByRole("button", { name: "Check this text" }).click();
  await page.getByRole("button", { name: /Continue: structure with/ }).click();

  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByText(/Honesty check: \d+ items to review/)).toBeVisible();
  await expect(
    page.getByText("“Initech” doesn't appear in your original resume.", { exact: false }),
  ).toBeVisible();
});

test("extraction errors are shown on the diagnostic page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Paste plain text" }).click();
  await page
    .getByPlaceholder("Paste your resume as plain text…")
    .fill("MOCK_FAIL resume text that is long enough to be sent to the extraction endpoint.");
  await page.getByRole("button", { name: "Check this text" }).click();
  await page.getByRole("button", { name: /Continue: structure with/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Try again" })).toBeVisible();
  await expect(page).toHaveURL(/\/diagnostic$/);
});
