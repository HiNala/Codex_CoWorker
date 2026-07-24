import { describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  ANNUAL_CHECKOUT_FIX_PATCH_PATH,
  assemblePrBody,
  createPullRequestPort,
  FakeGitHubPullRequestAdapter,
  GitHubPullRequestAdapter,
  patchSha256,
  type PrPipelineError,
  readPatchFile,
  sanitizeSecretText,
  stageLocalDemoRemote,
} from "./pr-pipeline";

const samplePatch = `diff --git a/src/checkout/prices.ts b/src/checkout/prices.ts
--- a/src/checkout/prices.ts
+++ b/src/checkout/prices.ts
@@ -1,3 +1,3 @@
-  team_annual: "price_1QxTeamA",
+  team_yearly: "price_1QxTeamA",
`;

const demoCheckoutDir = fileURLToPath(
  new URL("../../../../demo/acme-store/src/checkout", import.meta.url),
);

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
    ).rejects.toMatchObject({ code: "patch.empty" } satisfies Partial<PrPipelineError>);
  });
});

describe("hand-written annual-checkout-fix fixture (Track L step 3)", () => {
  it("is committed and non-empty", async () => {
    const patch = await readPatchFile(ANNUAL_CHECKOUT_FIX_PATCH_PATH);
    expect(patch).toContain("team_annual");
    expect(patch).toContain("team_yearly");
    expect(patch).toContain("BillingInterval");
    expect(patchSha256(patch)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is accepted by the Fake PR port", async () => {
    const patch = await readPatchFile(ANNUAL_CHECKOUT_FIX_PATCH_PATH);
    const port = new FakeGitHubPullRequestAdapter(undefined, 0);
    const result = await port.openPullRequest({
      repo: "acme-payments/acme-store",
      baseBranch: "main",
      headBranch: "forge/fix-annual-checkout-interval-handwritten",
      title: "Fix annual checkout returning a generic 500",
      body: assemblePrBody({
        diagnosis:
          "PlanToggle emits interval yearly while PRICE_IDS is keyed on annual.",
        impactCustomers: 9,
        impactWindow: "Jul 16 and Jul 23",
        impactAttempts: 40,
        changes: [
          "Shared BillingInterval type",
          "PRICE_IDS keyed on yearly",
          "resolvePrice returns a typed result",
        ],
        testsPassing: "yearly resolution + typed failure path",
        ticketId: "4471",
        assignmentId: "asg_handwritten",
      }),
      patch,
      assignmentId: "asg_handwritten",
    });
    expect(result.url).toContain("/pull/");
  });
});

describe("GitHubPullRequestAdapter (local bare remote + hand-written patch)", () => {
  it(
    "clones, applies fixture, commits trailers, pushes, creates PR",
    async () => {
      const { bareRemote, workRoot } = await stageLocalDemoRemote({
        sourceCheckoutDir: demoCheckoutDir,
        baseBranch: "main",
      });

      try {
        const patch = await readPatchFile(ANNUAL_CHECKOUT_FIX_PATCH_PATH);
        let createBody: unknown;
        const fetchFn: typeof fetch = async (_url, init) => {
          createBody = JSON.parse(String(init?.body ?? "{}"));
          return new Response(
            JSON.stringify({
              number: 42,
              html_url: "https://github.com/acme-payments/acme-store/pull/42",
            }),
            { status: 201, headers: { "Content-Type": "application/json" } },
          );
        };

        const port = new GitHubPullRequestAdapter({
          token: "test-token-not-a-real-pat",
          fetchFn,
          workRoot,
          remoteUrl: () => bareRemote,
        });

        const result = await port.openPullRequest({
          repo: "acme-payments/acme-store",
          baseBranch: "main",
          headBranch: "forge/fix-annual-checkout-interval-local",
          title: "Fix annual checkout interval mismatch",
          body: assemblePrBody({ diagnosis: "yearly vs annual key drift." }),
          patch,
          assignmentId: "asg_local_e2e",
          coAuthor: "Nala <nala@forge.local>",
        });

        expect(result.number).toBe(42);
        expect(result.url).toContain("/pull/42");
        expect(result.sha).toMatch(/^[0-9a-f]{40}$/);
        expect(createBody).toMatchObject({
          title: "Fix annual checkout interval mismatch",
          head: "forge/fix-annual-checkout-interval-local",
          base: "main",
        });

        // Idempotent retry must not open a second PR.
        const again = await port.openPullRequest({
          repo: "acme-payments/acme-store",
          baseBranch: "main",
          headBranch: "forge/fix-annual-checkout-interval-local",
          title: "Fix annual checkout interval mismatch",
          body: "ignored",
          patch,
          assignmentId: "asg_local_e2e",
        });
        expect(again).toEqual(result);
      } finally {
        await rm(workRoot, { recursive: true, force: true }).catch(() => undefined);
      }
    },
    30_000,
  );

  it(
    "fails loudly when the patch does not apply",
    async () => {
      const { bareRemote, workRoot } = await stageLocalDemoRemote({
        sourceCheckoutDir: demoCheckoutDir,
        baseBranch: "main",
      });

      try {
        const port = new GitHubPullRequestAdapter({
          token: "test-token",
          workRoot,
          remoteUrl: () => bareRemote,
          fetchFn: async () => new Response("should not be called", { status: 500 }),
        });

        await expect(
          port.openPullRequest({
            repo: "acme-payments/acme-store",
            baseBranch: "main",
            headBranch: "forge/bad-patch",
            title: "t",
            body: "b",
            patch: samplePatch, // context does not match real prices.ts
            assignmentId: "asg_bad",
          }),
        ).rejects.toMatchObject({ code: "patch.apply_failed" });
      } finally {
        await rm(workRoot, { recursive: true, force: true }).catch(() => undefined);
      }
    },
    30_000,
  );

  it("refuses empty patch before clone", async () => {
    const port = new GitHubPullRequestAdapter({
      token: "test-token",
      remoteUrl: () => {
        throw new Error("should not clone");
      },
    });
    await expect(
      port.openPullRequest({
        repo: "acme-payments/acme-store",
        baseBranch: "main",
        headBranch: "forge/empty",
        title: "t",
        body: "b",
        patch: "",
        assignmentId: "asg_empty_live",
      }),
    ).rejects.toMatchObject({ code: "patch.empty" });
  });
});

describe("assemblePrBody", () => {
  it("omits impact when customers cannot be derived", () => {
    const body = assemblePrBody({ diagnosis: "Mismatch.", changes: ["typed failure"] });
    expect(body).toContain("Mismatch.");
    expect(body).not.toContain("**Impact:**");
    expect(body).toContain("typed failure");
  });

  it("includes impact, verification, and ticket when all records are present", () => {
    const body = assemblePrBody({
      diagnosis: "yearly vs annual.",
      impactCustomers: 9,
      impactWindow: "Jul 16 and Jul 23",
      impactAttempts: 40,
      testsPassing: "13 of 13 tests passing",
      gatesPassing: "all gates green",
      repairCycles: 1,
      ticketId: "4471",
      assignmentId: "asg_demo",
    });
    expect(body).toContain("**Impact:** 9 distinct customers");
    expect(body).toContain("40 failed attempts");
    expect(body).toContain("13 of 13 tests passing");
    expect(body).toContain("1 repair cycle");
    expect(body).toContain("Ticket 4471");
    expect(body).toContain("assignment `asg_demo`");
  });
});

describe("patchSha256", () => {
  it("hashes patch content", () => {
    expect(patchSha256(samplePatch)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("sanitizeSecretText", () => {
  it("strips x-access-token, bearer, and classic PAT shapes", () => {
    expect(
      sanitizeSecretText(
        "fatal: https://x-access-token:gho_SECRETvalue123@github.com/acme/repo.git",
      ),
    ).toContain("x-access-token:***@");
    expect(sanitizeSecretText("Authorization: Bearer ghp_ABCDEFG1234567890")).toContain(
      "Bearer ***",
    );
    expect(sanitizeSecretText("token ghp_ABCDEFG1234567890 leaked")).toContain("ghp_***");
  });
});

describe("createPullRequestPort", () => {
  it("defaults to Fake when GITHUB_TOKEN is unset", () => {
    const { port, state } = createPullRequestPort({});
    expect(state).toBe("not_configured");
    expect(port).toBeInstanceOf(FakeGitHubPullRequestAdapter);
  });

  it("selects live adapter when token is present", () => {
    const { port, state } = createPullRequestPort({ GITHUB_TOKEN: " ghp_x " });
    expect(state).toBe("connected");
    expect(port).toBeInstanceOf(GitHubPullRequestAdapter);
  });
});

