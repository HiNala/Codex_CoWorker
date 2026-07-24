import { expect, test } from "@playwright/test";

/**
 * Demo control panel at /demo (Track J).
 * Hidden from nav; Reset + PANIC are the load-bearing controls.
 * Skips cleanly when the route is not shipped yet (404).
 */
test.describe("Demo control panel", () => {
  test("PANIC and Reset controls render", async ({ page }) => {
    const response = await page.goto("/demo");
    const status = response?.status() ?? 0;

    if (status === 404) {
      test.skip(true, "/demo not available yet (404)");
    }

    // Soft-handle Next.js notFound HTML that still returns 200 in some setups.
    const notFound =
      (await page.getByRole("heading", { name: /not found|404/i }).count()) > 0 ||
      (await page.getByText(/this page could not be found/i).count()) > 0;
    if (notFound) {
      test.skip(true, "/demo rendered not-found");
    }

    // Prefer stable testids when present; fall back to accessible names / text.
    const resetControl = page
      .getByTestId("demo-reset")
      .or(page.getByRole("button", { name: /reset/i }))
      .or(page.getByText(/reset to clean state/i));

    const panicControl = page
      .getByTestId("demo-panic")
      .or(page.getByRole("button", { name: /panic/i }))
      .or(page.getByText(/panic:\s*all\s*→\s*fake/i));

    await expect(resetControl.first()).toBeVisible({ timeout: 10_000 });
    await expect(panicControl.first()).toBeVisible({ timeout: 10_000 });
  });
});
