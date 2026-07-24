import { expect, test } from "@playwright/test";

test("foundation and cockpit shell render", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Build the coworker the work demands." }),
  ).toBeVisible();

  await page.goto("/a/0198206f-5f53-7000-8000-000000000005");
  for (const label of ["Conversation", "Mission control", "The foundry", "Artifact dock"]) {
    await expect(page.getByLabel(label).first()).toBeVisible();
  }
});
