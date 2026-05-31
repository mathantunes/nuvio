import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_EMAIL ?? "test@nuvio.local";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "testpassword123";
const TEST_YEAR = new Date().getFullYear();

async function ensureBudgetExists(page: Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  const existingLink = page.getByTestId(`budget-link-${TEST_YEAR}`);
  if (await existingLink.isVisible()) {
    await existingLink.click();
    await page.waitForURL(`/app/${TEST_YEAR}`);
    return;
  }
  // First-time setup: currency field is required
  await page.getByTestId("currency-input-base").fill("USD");
  await page.getByRole("option", { name: "USD" }).first().click();
  await page.getByTestId("create-budget-submit").click();
  await page.waitForURL(`/app/${TEST_YEAR}`);
}

test.describe("Clipboard import flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("email-input").fill(TEST_EMAIL);
    await page.getByTestId("password-input").fill(TEST_PASSWORD);
    await page.getByTestId("auth-submit").click();
    await page.waitForURL("/app");
  });

  test("login redirects to /app dashboard", async ({ page }) => {
    await expect(page).toHaveURL("/app");
  });

  test("can create or open a budget for the current year", async ({ page }) => {
    await ensureBudgetExists(page);
    await expect(page).toHaveURL(`/app/${TEST_YEAR}`);
  });

  test("clipboard import modal opens and parses pasted rows", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await ensureBudgetExists(page);

    await page.goto(`/app/${TEST_YEAR}/planning`);
    await page.waitForLoadState("networkidle");

    const clipboardData = [
      "Salary\t5000\t5000\t5000",
      "Rent\t1200\t1200\t1200",
      "Groceries\t600\t650\t620",
    ].join("\n");
    await page.evaluate((text) => navigator.clipboard.writeText(text), clipboardData);

    await page.getByTestId("import-from-spreadsheet").click();

    await expect(page.getByTestId("clipboard-import-modal")).toBeVisible();
    await expect(page.getByTestId("import-row")).toHaveCount(3);
  });
});
