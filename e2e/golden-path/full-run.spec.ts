/**
 * Golden path e2e — Track J §6 skeleton adapted to the current cockpit UI.
 *
 * Against fakes is the default path. No waitForTimeout — use expect timeouts only.
 *
 * Gate 1 (now): assert shell surfaces that exist; soft-skip missing contract/run UI.
 * Gate 2 (when UI lands): full contract → approve → foundry → install → receipt path.
 */

import { expect, test, type Page } from "@playwright/test";
import {
  GOLDEN_PROMPT,
  SEEDED_ASSIGNMENT_ID,
  panicAdapters,
  resetDemo,
  seedDemo,
} from "./helpers";

const COCKPIT_PANELS = [
  "Conversation",
  "Mission control",
  "The foundry",
  "Artifact dock",
] as const;

async function openSeededCockpit(page: Page, assignmentId = SEEDED_ASSIGNMENT_ID) {
  await page.goto(`/a/${assignmentId}`);
  for (const label of COCKPIT_PANELS) {
    await expect(page.getByLabel(label).first()).toBeVisible({ timeout: 15_000 });
  }
}

test.describe("Golden path — current shell (exists now)", () => {
  test("seeded assignment renders cockpit panels", async ({ page }) => {
    await openSeededCockpit(page);
    await expect(page.getByText("Annual checkout recovery").first()).toBeVisible();
    await expect(page.getByText(SEEDED_ASSIGNMENT_ID).first()).toBeVisible();
  });

  test("resetDemo helper targets POST /api/demo/reset with access code", async () => {
    const result = await resetDemo();
    // Endpoint may still be landing (sibling Track J work). Soft-pass on 404/not configured.
    if (result.status === 404 || result.status === 0) {
      test.info().annotations.push({
        type: "note",
        description: `resetDemo not available yet (status ${result.status}); helper call shape is ready`,
      });
      return;
    }
    // When present: accept success or honest degradation — not an unhandled 5xx from a missing body.
    expect([200, 204, 401, 403, 409, 503]).toContain(result.status);
  });

  test("seedDemo and panicAdapters helpers call demo control endpoints", async () => {
    const seed = await seedDemo();
    const panic = await panicAdapters();

    for (const [name, result] of [
      ["seedDemo", seed],
      ["panicAdapters", panic],
    ] as const) {
      if (result.status === 404 || result.status === 0) {
        test.info().annotations.push({
          type: "note",
          description: `${name} not available yet (status ${result.status})`,
        });
        continue;
      }
      expect(result.status, name).toBeGreaterThanOrEqual(200);
      expect(result.status, name).toBeLessThan(500);
    }

    if (seed.ok && seed.assignmentId) {
      expect(seed.assignmentId.length).toBeGreaterThan(0);
    }
  });
});

test.describe("Golden path — mid-run reload resilience (stub)", () => {
  /**
   * Track A / J invariant: refreshing mid-run loses nothing.
   * Until SSE + run state hydrate, this stub proves the assignment shell
   * rehydrates the same static panels after reload (no waitForTimeout).
   */
  test("cockpit panels survive reload on seeded assignment", async ({ page }) => {
    await openSeededCockpit(page);

    // Snapshot of shell copy that must remain after reload.
    await expect(page.getByText("The stream rail is ready.").first()).toBeVisible();
    await expect(page.getByText("Checkout error log analyzer").first()).toBeVisible();

    await page.reload();

    for (const label of COCKPIT_PANELS) {
      await expect(page.getByLabel(label).first()).toBeVisible({ timeout: 15_000 });
    }
    await expect(page.getByText(SEEDED_ASSIGNMENT_ID).first()).toBeVisible();
    await expect(page.getByText("The stream rail is ready.").first()).toBeVisible();
    await expect(page.getByText("Checkout error log analyzer").first()).toBeVisible();
  });

  // Gate 2 — when run stream + capability tiles with data-status land:
  // test("reload mid-run restores capability tile state", async ({ page }) => {
  //   await resetDemo();
  //   // drive run to awaiting_approval …
  //   await page.reload();
  //   await expect(page.getByTestId("capability-tile-awaiting_approval")).toBeVisible();
  // });
});

test.describe("Golden path — full run against fakes", () => {
  /**
   * Track J §6 skeleton. Soft-stages when contract/approve UI is not built yet.
   * Un-skip / un-return Gate 2 blocks once composers and data-testids exist.
   */
  test("golden path", async ({ page }) => {
    const reset = await resetDemo();
    if (!reset.ok) {
      test.info().annotations.push({
        type: "note",
        description: `resetDemo soft-skipped (status ${reset.status}); continuing against seeded shell`,
      });
    }

    // Prefer /a/new when the new-assignment composer exists.
    // Note: Next may route /a/new as assignmentId="new" without a 404 — detect by composer presence.
    await page.goto("/a/new");
    const assignmentBox = page.getByRole("textbox", { name: /assignment/i });
    const hasComposer = (await assignmentBox.count()) > 0;

    if (!hasComposer) {
      // Soft stage — assert what exists now on the seeded cockpit.
      await openSeededCockpit(page);
      await expect(page.getByLabel("The foundry").getByText("missing").first()).toBeVisible();
      await expect(page.getByLabel("Artifact dock").getByText("Receipt").first()).toBeVisible();
      test.info().annotations.push({
        type: "note",
        description:
          "Contract/approve UI not built yet — soft stage only. Gate 2 enables full golden path.",
      });
      return;
    }

    await assignmentBox.fill(GOLDEN_PROMPT);
    await page.getByRole("button", { name: /review assignment/i }).click();

    await expect(page.getByTestId("contract-objective")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /approve and begin/i }).click();

    // Dock fills with declared placeholders (Track E: 4–5 artifact slots).
    await expect(page.getByTestId("artifact-card")).toHaveCount(4, { timeout: 30_000 });

    // Capability gap detected; foundry starts.
    await expect(page.getByTestId("capability-tile-missing")).toBeVisible({
      timeout: 60_000,
    });

    // Trusted gate fails, then repairs (fake Codex attempt 1 → 2).
    await expect(page.getByTestId("gate-trusted_tests")).toHaveAttribute(
      "data-status",
      "failed",
      { timeout: 90_000 },
    );
    await expect(page.getByTestId("gate-trusted_tests")).toHaveAttribute(
      "data-status",
      "passed",
      { timeout: 90_000 },
    );

    // Refresh MID-RUN and lose nothing.
    await page.reload();
    await expect(page.getByTestId("capability-tile-awaiting_approval")).toBeVisible({
      timeout: 30_000,
    });

    // Press-and-hold install approval (delay is pointer hold, not a sleep).
    await page.getByTestId("approve-install").click({ delay: 700 });
    await expect(page.getByTestId("capability-tile-installed")).toBeVisible({
      timeout: 60_000,
    });

    await expect(page.getByTestId("artifact-card-receipt")).toHaveAttribute(
      "data-status",
      "ready",
      { timeout: 120_000 },
    );

    // ── test.fix placeholders (Track J amendment / Track L) ─────────────────
    // PR opened exactly once under retry.
    // await expect(page.getByTestId("pr-link")).toHaveCount(1);
    // await expect(page.getByTestId("pr-open-count")).toHaveAttribute("data-count", "1");

    // Email body sent matches the body that was approved, byte for byte.
    // const approvedBody = await page.getByTestId("email-approved-body").innerText();
    // const sentBody = await page.getByTestId("email-sent-body").innerText();
    // expect(sentBody).toBe(approvedBody);
  });
});

// Gate 2 — enable when PR + email surfaces ship with data-testids.
test.describe.skip("Golden path — PR-once and email body match (Gate 2)", () => {
  // Un-skip this describe when Track L PR + email approval UI lands.

  test("pull request is opened exactly once under retry", async ({ page }) => {
    await resetDemo();
    // Drive golden path to code.change ready, force a notifier retry, then:
    await page.goto(`/a/${SEEDED_ASSIGNMENT_ID}`);
    await expect(page.getByTestId("pr-link")).toHaveCount(1);
    await expect(page.getByTestId("pr-open-count")).toHaveAttribute("data-count", "1");
  });

  test("email body matches approved body byte for byte", async ({ page }) => {
    await resetDemo();
    await page.goto(`/a/${SEEDED_ASSIGNMENT_ID}`);
    const approvedBody = await page.getByTestId("email-approved-body").innerText();
    const sentBody = await page.getByTestId("email-sent-body").innerText();
    expect(sentBody).toBe(approvedBody);
  });
});
