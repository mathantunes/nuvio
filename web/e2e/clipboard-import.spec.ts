import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_EMAIL ?? "test@nuvio.local";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "testpassword123";
const TEST_YEAR = new Date().getFullYear();

test.describe("Clipboard import flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator("[data-testid='email-input']").fill(TEST_EMAIL);
    await page.locator("[data-testid='password-input']").fill(TEST_PASSWORD);
    await page.locator("[data-testid='auth-submit']").click();
    await page.waitForURL("/app");
  });

  test("login redirects to /app dashboard", async ({ page }) => {
    await expect(page).toHaveURL("/app");
  });

  test("can create or open a budget for the current year", async ({ page }) => {
    const existingLink = page.locator(`[data-testid='budget-link-${TEST_YEAR}']`);

    if (await existingLink.isVisible()) {
      await existingLink.click();
    } else {
      await page.locator("[data-testid='create-budget-submit']").click();
      await page.waitForURL(`/app/${TEST_YEAR}*`);
    }

    await expect(page).toHaveURL(new RegExp(`/app/${TEST_YEAR}`));
  });

  test("clipboard import modal opens and parses pasted rows", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto(`/app/${TEST_YEAR}/planning`);
    await page.waitForLoadState("networkidle");

    const clipboardData = [
      "Salary\t5000\t5000\t5000",
      "Rent\t1200\t1200\t1200",
      "Groceries\t600\t650\t620",
    ].join("\n");
    await page.evaluate((text) => navigator.clipboard.writeText(text), clipboardData);

    await page.locator("[data-testid='import-from-spreadsheet']").click();

    await expect(page.locator("[data-testid='clipboard-import-modal']")).toBeVisible();
    await expect(page.locator("[data-testid='import-rows'] [data-testid='import-row']")).toHaveCount(3);
  });
});
