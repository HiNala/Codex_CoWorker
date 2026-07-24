/**
 * Dextwork desktop shell — structural viewports.
 * 1920×1080 and 1440×900. No waitForTimeout.
 */
import { expect, test } from "@playwright/test";

const ASSIGNMENT = "01900000-0000-7000-8000-000000000020";

async function assertDextworkShell(page: import("@playwright/test").Page) {
  await page.goto(`/a/${ASSIGNMENT}`);

  await expect(page.getByLabel("Dextwork")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Conversation")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("Mission control")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("The foundry")).toBeVisible({ timeout: 15_000 });

  // Broken Checkout default copy (not webhook rename)
  await expect(page.getByText("Broken Checkout").first()).toBeVisible({ timeout: 15_000 });

  // Phase ribbon
  await expect(page.getByLabel("Run phase")).toBeVisible();
  await expect(page.getByText("Intake").first()).toBeVisible();
  await expect(page.getByText("Approve").first()).toBeVisible();

  // Active task / capability signals
  await expect(page.getByText(/checkout|annual|ticket|error log/i).first()).toBeVisible();

  // No body scroll — shell owns the viewport
  const bodyScroll = await page.evaluate(() => {
    const el = document.documentElement;
    return { sh: el.scrollHeight, ch: el.clientHeight };
  });
  expect(bodyScroll.sh).toBeLessThanOrEqual(bodyScroll.ch + 2);

  // No full-width bottom dock label
  await expect(page.getByLabel("Assignment outputs")).toHaveCount(0);
}

test.describe("Dextwork shell viewports", () => {
  test("1920×1080", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await assertDextworkShell(page);
  });

  test("1440×900", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await assertDextworkShell(page);
  });
});
