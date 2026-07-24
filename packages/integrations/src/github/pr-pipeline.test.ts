import { describe, expect, it } from "vitest";
import {
  assemblePrBody,
  FakeGitHubPullRequestAdapter,
  patchSha256,
  PrPipelineError,
} from "./pr-pipeline";

const samplePatch = `diff --git a/src/checkout/prices.ts b/src/checkout/prices.ts
--- a/src/checkout/prices.ts
+++ b/src/checkout/prices.ts
@@ -1,3 +1,3 @@
-  team_annual: "price_1QxTeamA",
+  team_yearly: "price_1QxTeamA",
`;

describe("FakeGitHubPullRequestAdapter", () => {
  it("opens a PR from a hand-written patch (step 3 before step 4)", async () => {
    const port = new FakeGitHubPullRequestAdapter(
      {
        number: 17,
        url: "https://github.com/acme-payments/acme-store/pull/17",
        sha: "b".repeat(40),
      },
      0,
    );

    const result = await port.openPullRequest({
      repo: "acme-payments/acme-store",
      baseBranch: "main",
      headBranch: "forge/fix-annual-checkout-interval-abc",
      title: "Fix annual checkout interval mismatch",
      body: assemblePrBody({
        diagnosis: "PlanToggle emits yearly; PRICE_IDS keyed annual.",
        impactCustomers: 9,
        impactWindow: "Jul 16 and Jul 23",
        impactAttempts: 40,
        testsPassing: "13 of 13 tests passing",
        ticketId: "4471",
        assignmentId: "asg_demo",
      }),
      patch: samplePatch,
      assignmentId: "asg_demo",
    });

    expect(result.number).toBe(17);
    expect(result.url).toContain("/pull/17");
    expect(port.opened).toHaveLength(1);
  });

  it("is idempotent on assignmentId + headBranch", async () => {
    const port = new FakeGitHubPullRequestAdapter(undefined, 0);
    const input = {
      repo: "acme-payments/acme-store",
      baseBranch: "main",
      headBranch: "forge/fix-x",
      title: "t",
      body: "b",
      patch: samplePatch,
      assignmentId: "asg_1",
    };
    const a = await port.openPullRequest(input);
    const b = await port.openPullRequest(input);
    expect(a).toEqual(b);
    expect(port.opened).toHaveLength(1);
  });

  it("refuses an empty patch", async () => {
    const port = new FakeGitHubPullRequestAdapter(undefined, 0);
    await expect(
      port.openPullRequest({
        repo: "acme-payments/acme-store",
        baseBranch: "main",
        headBranch: "forge/empty",
        title: "t",
        body: "b",
        patch: "   ",
        assignmentId: "asg_2",
      }),
    ).rejects.toBeInstanceOf(PrPipelineError);
  });
});

describe("assemblePrBody", () => {
  it("omits impact when customers cannot be derived", () => {
    const body = assemblePrBody({ diagnosis: "Mismatch.", changes: ["typed failure"] });
    expect(body).toContain("Mismatch.");
    expect(body).not.toContain("**Impact:**");
    expect(body).toContain("typed failure");
  });
});

describe("patchSha256", () => {
  it("hashes patch content", () => {
    expect(patchSha256(samplePatch)).toMatch(/^[a-f0-9]{64}$/);
  });
});
