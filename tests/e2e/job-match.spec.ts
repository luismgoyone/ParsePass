import { expect, test, type Page } from "@playwright/test";

const JOB = `Senior Frontend Engineer. We're hiring an engineer to build our patient-facing web apps.
You'll work in TypeScript, React and Next.js, and design GraphQL APIs with the backend team.
Nice to have: PostgreSQL and Kubernetes experience.`;

async function openReview(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample resume" }).click();
  await page.getByRole("button", { name: /Continue: structure with/ }).click();
  await expect(page).toHaveURL(/\/review$/);
}

test("job keyword match lists covered and missing terms, and updates as you edit", async ({
  page,
}) => {
  await openReview(page);
  await page.getByPlaceholder("Paste the job description…").fill(JOB);
  await page.getByRole("button", { name: "Check keywords" }).click();

  await expect(page.getByText("Target: Senior Frontend Engineer")).toBeVisible();
  // Covered: TypeScript, React, Next.js (required) + PostgreSQL (preferred). Missing: GraphQL, Kubernetes.
  await expect(page.getByTestId("keyword-score")).toHaveText("70%");
  await expect(page.getByText("Not on your resume (2)")).toBeVisible();
  await expect(page.getByText("Required 3/4 · Preferred 1/2")).toBeVisible();

  // Nothing is inserted for you; adding a true skill yourself raises the score.
  await page.getByLabel("Add skills to Skills").fill("GraphQL");
  await page.getByLabel("Add skills to Skills").press("Enter");
  await expect(page.getByTestId("keyword-score")).toHaveText("90%");
  await expect(page.getByText("Not on your resume (1)")).toBeVisible();
});

test("bullet suggestions are shown as diffs, and ones that add facts are thrown out", async ({
  page,
}) => {
  await openReview(page);
  await page.getByRole("button", { name: "Suggest stronger wording" }).first().click();

  const suggestions = page.getByRole("list", { name: "Suggestions" });
  await expect(suggestions.getByRole("listitem")).toHaveCount(1);
  await expect(suggestions).toContainText("Bullet 1 · Stronger verb, less filler");
  await expect(
    page.getByText("1 suggestion was thrown out for adding facts that aren't on your resume."),
  ).toBeVisible();

  await suggestions.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByLabel("Bullets 1").first()).toHaveValue(
    "Rebuilt the patient portal in Next.js, cutting load time by 40%.",
  );
  await expect(page.getByText("Honesty check: nothing added")).toBeVisible();
});
