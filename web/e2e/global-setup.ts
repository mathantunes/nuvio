import { chromium } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_EMAIL ?? "test@nuvio.local";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "testpassword123";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

/**
 * Runs once before the entire test suite.
 * Signs up the test user — if the user already exists the server returns an
 * error and we simply move on; the subsequent login will succeed.
 */
export default async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${BASE_URL}/login`);

  // Switch to "Create account" tab
  await page.getByTestId("tab-signup").click();

  await page.getByTestId("email-input").fill(TEST_EMAIL);
  await page.getByTestId("password-input").fill(TEST_PASSWORD);
  await page.getByTestId("auth-submit").click();

  // Wait briefly — either we land on /app (new user) or an error appears (user exists)
  await page.waitForTimeout(2000);

  await browser.close();
}
