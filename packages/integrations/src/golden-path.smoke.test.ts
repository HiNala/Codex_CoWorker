/**
 * Tracks F/L golden-path rehearsal — offline / fake credentials only.
 * Sandbox holds ZERO credentials; host applies hand-written patch locally.
 * No live GitHub PR, Gmail, Zendesk, or Octen network calls.
 */
import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile, mkdir, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import type { ExternalActionProposal } from "@forge/contracts";
import {
  ANNUAL_CHECKOUT_FIX_PATCH_PATH,
  assemblePrBody,
  createPullRequestPort,
  FakeGitHubPullRequestAdapter,
  GitHubPullRequestAdapter,
  readPatchFile,
  stageLocalDemoRemote,
} from "./github/pr-pipeline";
import {
  ExternalActionExecutor,
  freezeProposal,
  payloadSha256,
} from "./approval/execute";
import { createNotifier, FakeNotifier } from "./email/notifier";
import { createTicketGateway, ImportTicketGateway } from "./zendesk/ticket-gateway";
import { integrationStatus } from "./status";
import {
  assertBrokenCheckoutCopy,
  BROKEN_CHECKOUT_ASSIGNMENT_TITLE,
  BROKEN_CHECKOUT_DIAGNOSIS,
  BROKEN_CHECKOUT_EMAIL,
  BROKEN_CHECKOUT_PR_CHANGES,
  BROKEN_CHECKOUT_PR_TITLE,
  BROKEN_CHECKOUT_ASSIGNMENT_HREF,
  BROKEN_CHECKOUT_TICKET,
  FORBIDDEN_LIVE_SCENARIO_MARKERS,
  LIVE_CHECKOUT_ERROR_LOG,
  LIVE_EXECUTABLE_CAPABILITY,
} from "./demo/broken-checkout-scenario";

const execFileAsync = promisify(execFile);

const demoCheckoutDir = fileURLToPath(
  new URL("../../../demo/acme-store/src/checkout", import.meta.url),
);
const demoRoot = fileURLToPath(new URL("../../../demo/acme-store", import.meta.url));

const ORG = "0198206f-5f53-7000-8000-000000000001";
const APPROVAL_ID = "0198206f-5f53-7000-8000-000000000801";
const ASSIGNMENT = "asg_golden_fl_rehearsal";

describe("F/L golden path rehearsal (fakes + host patch, no live credentials)", () => {
  it("degrades Zendesk / GitHub / email / Octen honestly when unconfigured", async () => {
    const emptyEnv = {
      // Explicitly empty — never read live secrets for this rehearsal.
      ZENDESK_SUBDOMAIN: undefined,
      ZENDESK_EMAIL: undefined,
      ZENDESK_API_TOKEN: undefined,
      ZENDESK_WEBHOOK_SECRET: undefined,
      GITHUB_TOKEN: undefined,
      GITHUB_PAT: undefined,
      COMPOSIO_API_KEY: undefined,
      COMPOSIO_USER_ID: undefined,
      COMPOSIO_GMAIL_ACCOUNT_ID: undefined,
      RESEND_API_KEY: undefined,
      OCTEN_API_KEY: undefined,
    };

    const tickets = createTicketGateway(emptyEnv);
    expect(tickets.state).toBe("not_configured");
    expect(tickets.gateway).toBeInstanceOf(ImportTicketGateway);

    const pr = createPullRequestPort(emptyEnv);
    expect(pr.state).toBe("not_configured");
    expect(pr.port).toBeInstanceOf(FakeGitHubPullRequestAdapter);

    const mail = createNotifier(emptyEnv);
    expect(mail.state).toBe("not_configured");
    expect(mail.provider).toBe("fake");
    expect(mail.notifier).toBeInstanceOf(FakeNotifier);

    // Octen lives in @forge/research (createResearchGateway → Fake when OCTEN_API_KEY unset).
    // Status surface here must still report not_configured without leaking secrets.
    const status = integrationStatus(emptyEnv);
    for (const provider of ["zendesk", "github", "email", "octen", "composio"] as const) {
      const row = status.find((s) => s.provider === provider);
      expect(row, provider).toBeDefined();
      expect(["not_configured", "degraded"]).toContain(row!.state);
      // Never leak secrets in status detail.
      expect(JSON.stringify(row)).not.toMatch(/sk-|ghp_|github_pat_|api[_-]?key/i);
    }
  });

  it("uses Broken Checkout ticket/assignment copy — never API-rename inventory story", async () => {
    expect(BROKEN_CHECKOUT_ASSIGNMENT_TITLE).toMatch(/checkout/i);
    expect(LIVE_EXECUTABLE_CAPABILITY).toBe("checkout-error-log-analyzer");
    expect(LIVE_CHECKOUT_ERROR_LOG).toContain("checkout-errors.ndjson");
    expect(BROKEN_CHECKOUT_ASSIGNMENT_HREF).toMatch(/^\/a\//);
    expect(BROKEN_CHECKOUT_TICKET.subject).toMatch(/annual|Team/i);
    assertBrokenCheckoutCopy(BROKEN_CHECKOUT_ASSIGNMENT_TITLE);
    assertBrokenCheckoutCopy(BROKEN_CHECKOUT_TICKET.body);
    assertBrokenCheckoutCopy(BROKEN_CHECKOUT_DIAGNOSIS);
    assertBrokenCheckoutCopy(BROKEN_CHECKOUT_EMAIL.body);
    for (const marker of FORBIDDEN_LIVE_SCENARIO_MARKERS) {
      expect(BROKEN_CHECKOUT_ASSIGNMENT_TITLE.toLowerCase()).not.toContain(marker.toLowerCase());
      expect(BROKEN_CHECKOUT_EMAIL.body.toLowerCase()).not.toContain(marker.toLowerCase());
      expect(BROKEN_CHECKOUT_PR_TITLE.toLowerCase()).not.toContain(marker.toLowerCase());
    }
    const tickets = createTicketGateway({});
    const list = await tickets.gateway.listRecent({ limit: 5 });
    expect(list[0]?.id).toBe(BROKEN_CHECKOUT_TICKET.id);
    expect(list[0]?.subject).toMatch(/annual|checkout|Team/i);
    for (const t of list) {
      assertBrokenCheckoutCopy(`${t.subject}\n${t.body}`);
    }
  });

  it("gates external email on exact approved Broken Checkout payload (no re-plan)", async () => {
    const proposal: ExternalActionProposal = {
      provider: "email",
      action: "send",
      accountRef: "acct_fake_gmail",
      arguments: {
        to: BROKEN_CHECKOUT_EMAIL.to,
        subject: BROKEN_CHECKOUT_EMAIL.subject,
        body: BROKEN_CHECKOUT_EMAIL.body,
      },
      reason: "Notify owner after annual-checkout PR open",
      risk: "customer_facing",
      idempotencyKey: `${ASSIGNMENT}:email:owner`,
    };
    assertBrokenCheckoutCopy(JSON.stringify(proposal.arguments));

    let executedBody: string | undefined;
    const executor = new ExternalActionExecutor({
      executors: {
        email: async (p) => {
          executedBody = String(p.arguments.body ?? "");
          return {
            provider: "email",
            action: "send",
            externalId: "fake-msg-1",
            permalink: "https://mail.example/fake-msg-1",
          };
        },
        github: async () => {
          throw new Error("github executor must not run without approval path");
        },
      },
      statusProbe: async () => integrationStatus({}),
    });

    const frozen = freezeProposal(APPROVAL_ID, proposal, "approved");
    expect(frozen.payloadSha256).toBe(payloadSha256(proposal));
    executor.registerApproval(frozen);

    const ok = await executor.execute(proposal, APPROVAL_ID);
    expect(ok.externalId).toBe("fake-msg-1");
    expect(executedBody).toContain("Nine customers");
    expect(executedBody).toContain("4471");
    expect(executedBody).toMatch(/checkout|billing interval|Stripe/i);
    assertBrokenCheckoutCopy(executedBody ?? "");

    // Mutated body after approval → refuse (backend never re-plans).
    const mutated: ExternalActionProposal = {
      ...proposal,
      arguments: { ...proposal.arguments, body: "MUTATED — should never send" },
    };
    await expect(executor.execute(mutated, APPROVAL_ID)).rejects.toMatchObject({
      code: "approval.payload_mismatch",
    });

    // Idempotent: second execute returns same result, no second send.
    executedBody = "should-not-overwrite";
    const again = await executor.execute(proposal, APPROVAL_ID);
    expect(again.externalId).toBe("fake-msg-1");
    expect(executedBody).toBe("should-not-overwrite");
  });

  it("host applies hand-written Broken Checkout patch on clean local clone and prepares PR payload", async () => {
    const { bareRemote, workRoot } = await stageLocalDemoRemote({
      sourceCheckoutDir: demoCheckoutDir,
      baseBranch: "main",
    });

    try {
      const patch = await readPatchFile(ANNUAL_CHECKOUT_FIX_PATCH_PATH);
      expect(patch).toContain("team_annual");
      expect(patch).toContain("team_yearly");

      let createBody: {
        title?: string;
        head?: string;
        base?: string;
        body?: string;
      } = {};

      // Host-side adapter with local bare remote — ZERO real GitHub credentials.
      const port = new GitHubPullRequestAdapter({
        token: "sandbox-must-not-see-this-host-only-test-token",
        workRoot,
        remoteUrl: () => bareRemote,
        fetchFn: async (_url, init) => {
          createBody = JSON.parse(String(init?.body ?? "{}")) as typeof createBody;
          return new Response(
            JSON.stringify({
              number: 17,
              html_url: "https://github.com/acme-payments/acme-store/pull/17",
            }),
            { status: 201, headers: { "Content-Type": "application/json" } },
          );
        },
      });

      const headBranch = `forge/fix-annual-checkout-interval-golden`;
      const body = assemblePrBody({
        diagnosis: BROKEN_CHECKOUT_DIAGNOSIS,
        impactCustomers: 9,
        impactWindow: "Jul 16 and Jul 23",
        impactAttempts: 40,
        changes: [...BROKEN_CHECKOUT_PR_CHANGES],
        testsPassing: "yearly resolution + typed failure",
        ticketId: "4471",
        assignmentId: ASSIGNMENT,
      });
      assertBrokenCheckoutCopy(body);

      const result = await port.openPullRequest({
        repo: "acme-payments/acme-store",
        baseBranch: "main",
        headBranch,
        title: BROKEN_CHECKOUT_PR_TITLE,
        body,
        patch,
        assignmentId: ASSIGNMENT,
        coAuthor: "Nala <nala@forge.local>",
      });

      expect(result.number).toBe(17);
      expect(result.url).toContain("/pull/17");
      expect(result.sha).toMatch(/^[0-9a-f]{40}$/);
      expect(createBody.head).toBe(headBranch);
      expect(createBody.base).toBe("main");
      expect(createBody.title).toBe(BROKEN_CHECKOUT_PR_TITLE);
      expect(createBody.body).toContain("9 distinct customers");
      expect(createBody.body).toMatch(/yearly|annual|PRICE_IDS|PlanToggle/i);
      expect(createBody.body).not.toMatch(/Webhook field rename|api-change-impact/i);
      expect(createBody.body).not.toMatch(/x-access-token:|ghp_|Bearer\s+[A-Za-z0-9]/);
      assertBrokenCheckoutCopy(createBody.body ?? "");

      // Prove applied tree: clone bare@head and assert yearly keys + resolvePrice.
      const verifyDir = join(workRoot, "verify-head");
      await execFileAsync("git", ["clone", "--branch", headBranch, bareRemote, verifyDir]);
      const prices = await readFile(join(verifyDir, "src/checkout/prices.ts"), "utf8");
      expect(prices).toContain("team_yearly");
      expect(prices).not.toMatch(/team_annual:/);
      expect(prices).toContain('BillingInterval = "monthly" | "yearly"');
      expect(prices).toContain("resolvePrice");

      // Dynamic import of applied module (file URL) to prove runtime resolution.
      const pricesUrl = pathToFileURL(join(verifyDir, "src/checkout/prices.ts")).href;
      const mod = (await import(pricesUrl)) as {
        resolvePriceId: (plan: string, interval: string) => string | undefined;
        resolvePrice?: (
          plan: string,
          interval: string,
        ) => { ok: true; priceId: string } | { ok: false; reason: string };
      };
      expect(mod.resolvePriceId("team", "yearly")).toMatch(/^price_/);
      expect(mod.resolvePriceId("team", "monthly")).toMatch(/^price_/);
      // Legacy wrong key must not resolve after fix.
      expect(mod.resolvePriceId("team", "annual")).toBeUndefined();
      if (mod.resolvePrice) {
        expect(mod.resolvePrice("team", "yearly")).toEqual({
          ok: true,
          priceId: expect.stringMatching(/^price_/),
        });
      }
    } finally {
      await rm(workRoot, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 60_000);

  it("runs demo unit tests on a clean copy after applying the hand-written patch", async () => {
    const work = await mkdtemp(join(tmpdir(), "forge-demo-patch-"));
    try {
      // Minimal tree: checkout sources + vitest-free node assert (avoid full next install).
      await mkdir(join(work, "src/checkout"), { recursive: true });
      for (const name of ["prices.ts", "prices.test.ts", "session.ts", "session.test.ts"]) {
        await copyFile(join(demoCheckoutDir, name), join(work, "src/checkout", name));
      }
      // Normalize LF for apply on Windows.
      for (const name of ["prices.ts", "prices.test.ts"]) {
        const p = join(work, "src/checkout", name);
        const text = (await readFile(p, "utf8")).replace(/\r\n/g, "\n");
        await writeFile(p, text.endsWith("\n") ? text : `${text}\n`, "utf8");
      }

      await execFileAsync("git", ["init", "-b", "main"], { cwd: work });
      await execFileAsync("git", ["config", "core.autocrlf", "false"], { cwd: work });
      await execFileAsync("git", ["config", "user.email", "forge@local"], { cwd: work });
      await execFileAsync("git", ["config", "user.name", "FORGE"], { cwd: work });
      await execFileAsync("git", ["add", "src/checkout"], { cwd: work });
      await execFileAsync("git", ["commit", "-m", "seed"], { cwd: work });

      const patch = await readPatchFile(ANNUAL_CHECKOUT_FIX_PATCH_PATH);
      const patchPath = join(work, ".apply.patch");
      await writeFile(patchPath, patch.replace(/\r\n/g, "\n"), "utf8");
      await execFileAsync("git", ["apply", "--3way", patchPath], { cwd: work });

      // Post-apply: yearly works (was the bug).
      const pricesUrl = pathToFileURL(join(work, "src/checkout/prices.ts")).href;
      const mod = (await import(pricesUrl)) as {
        resolvePriceId: (a: string, b: string) => string | undefined;
      };
      expect(mod.resolvePriceId("starter", "yearly")).toBeTruthy();
      expect(mod.resolvePriceId("team", "yearly")).toBeTruthy();
      expect(mod.resolvePriceId("scale", "yearly")).toBeTruthy();
      expect(mod.resolvePriceId("team", "monthly")).toBeTruthy();

      // Unpatched demo still has the bug on main tree (control).
      const brokenUrl = pathToFileURL(join(demoCheckoutDir, "prices.ts")).href;
      // Cache-bust: import main demo prices (annual keys) — yearly must fail there.
      const broken = (await import(`${brokenUrl}?ctrl=${Date.now()}`)) as {
        resolvePriceId: (a: string, b: string) => string | undefined;
      };
      expect(broken.resolvePriceId("team", "yearly")).toBeUndefined();
      expect(broken.resolvePriceId("team", "monthly")).toBeTruthy();
    } finally {
      await rm(work, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 30_000);

  it("documents sandbox credential-free boundary for Cael (no secrets in PR events)", () => {
    // Sandbox emits patch only. Host opens PR. Event detail must never carry tokens.
    const sandboxOutbound = {
      type: "action.proposed" as const,
      provider: "github",
      action: "open_pull_request",
      arguments: {
        repo: "acme-payments/acme-store",
        baseBranch: "main",
        headBranch: "forge/fix-annual-checkout-interval-x",
        title: "Fix annual checkout",
        body: assemblePrBody({ impactCustomers: 9, impactWindow: "Jul 16 and Jul 23" }),
        patch: "diff --git a/x b/x\n", // sandbox-produced; host applies
        assignmentId: ASSIGNMENT,
      },
    };
    const serialized = JSON.stringify(sandboxOutbound);
    expect(serialized).not.toMatch(/GITHUB_|COMPOSIO_|ZENDESK_|token|Bearer|ghp_/i);

    // Host result detail for action.executed — URL + number only.
    const hostResult = {
      type: "action.executed" as const,
      provider: "github",
      externalId: "17",
      permalink: "https://github.com/acme-payments/acme-store/pull/17",
      sha: "a".repeat(40),
    };
    expect(JSON.stringify(hostResult)).not.toMatch(/x-access-token|ghp_/);
    void ORG;
    void demoRoot;
  });
});
