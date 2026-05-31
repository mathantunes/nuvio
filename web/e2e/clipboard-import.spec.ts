import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_EMAIL ?? "test@nuvio.local";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "testpassword123";
const TEST_YEAR = new Date().getFullYear();

test.describe("Clipboard import flow", () => {
  test.beforeEach(async ({ page }) => {
    // Log in with the seeded test user
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("/app");
  });

  test("login redirects to /app dashboard", async ({ page }) => {
    await expect(page).toHaveURL("/app");
  });

  test("can create a budget for the current year", async ({ page }) => {
    // If budget already exists (from a previous run) skip creation
    const existingLink = page.getByRole("link", { name: String(TEST_YEAR) });
    if (await existingLink.isVisible()) {
      await existingLink.click();
    } else {
      // Fill the year tracker creation form
      const yearInput = page.getByRole("spinbutton");
      await yearInput.fill(String(TEST_YEAR));
      await page.getByRole("button", { name: /add|create/i }).first().click();
      // Should redirect to /app/{year}
      await page.waitForURL(`/app/${TEST_YEAR}*`);
    }

    await expect(page).toHaveURL(new RegExp(`/app/${TEST_YEAR}`));
  });

  test("clipboard import modal opens and parses pasted rows", async ({ page, context }) => {
    // Grant clipboard permissions so readText() works
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Navigate to the planning tab
    await page.goto(`/app/${TEST_YEAR}/planning`);
    await page.waitForLoadState("networkidle");

    // Write test CSV data to the clipboard
    const clipboardData = [
      "Salary\t5000\t5000\t5000",
      "Rent\t1200\t1200\t1200",
      "Groceries\t600\t650\t620",
    ].join("\n");
    await page.evaluate((text) => navigator.clipboard.writeText(text), clipboardData);

    // Click the "Import from spreadsheet" button
    await page.getByTitle("Paste rows from a spreadsheet to bulk-import budget lines").click();

    // Modal should appear with parsed rows
    await expect(page.getByText("Salary")).toBeVisible();
    await expect(page.getByText("Rent")).toBeVisible();
    await expect(page.getByText("Groceries")).toBeVisible();
  });
});
