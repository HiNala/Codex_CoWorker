import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Host-side PR port. The sandbox holds ZERO credentials and only emits a patch.
 * This adapter clones, applies, commits, pushes, and opens the PR.
 */
export interface PullRequestPort {
  openPullRequest(input: OpenPullRequestInput): Promise<OpenPullRequestResult>;
}

export interface OpenPullRequestInput {
  repo: string; // 'owner/name'
  baseBranch: string;
  headBranch: string;
  title: string;
  body: string;
  /** Unified diff from the sandbox. */
  patch: string;
  assignmentId: string;
  coAuthor?: string;
}

export interface OpenPullRequestResult {
  number: number;
  url: string;
  sha: string;
}

export interface GitHubPrConfig {
  /** Fine-grained PAT: contents + pull requests on a single repo. */
  token: string;
  /** Optional override for api.github.com (tests). */
  apiBaseUrl?: string;
  /** Optional git binary. */
  gitBinary?: string;
  /** Injected fetch for Octokit-less REST. */
  fetchFn?: typeof fetch;
  /** Working directory root for temp clones. */
  workRoot?: string;
}

export class GitHubPullRequestAdapter implements PullRequestPort {
  readonly #token: string;
  readonly #apiBase: string;
  readonly #git: string;
  readonly #fetchFn: typeof fetch;
  readonly #workRoot: string;
  readonly #idempotency = new Map<string, OpenPullRequestResult>();

  constructor(config: GitHubPrConfig) {
    this.#token = config.token;
    this.#apiBase = config.apiBaseUrl ?? "https://api.github.com";
    this.#git = config.gitBinary ?? "git";
    this.#fetchFn = config.fetchFn ?? fetch;
    this.#workRoot = config.workRoot ?? tmpdir();
  }

  async openPullRequest(input: OpenPullRequestInput): Promise<OpenPullRequestResult> {
    const idemKey = `${input.assignmentId}:${input.headBranch}`;
    const existing = this.#idempotency.get(idemKey);
    if (existing) return existing;

    const dir = await mkdtemp(join(this.#workRoot, "forge-pr-"));
    try {
      const remote = `https://x-access-token:${this.#token}@github.com/${input.repo}.git`;
      await this.#gitCmd(dir, ["clone", "--depth", "1", "--branch", input.baseBranch, remote, "."]);
      await this.#gitCmd(dir, ["checkout", "-b", input.headBranch]);

      const patchPath = join(dir, ".forge-apply.patch");
      await writeFile(patchPath, input.patch, "utf8");

      try {
        await this.#gitCmd(dir, ["apply", "--3way", patchPath]);
      } catch (err) {
        // Fail loudly — never fuzzy-retry a half-applied patch into a PR.
        throw new PrPipelineError(
          "patch.apply_failed",
          `git apply --3way failed; refusing to open PR. ${errorMessage(err)}`,
        );
      }

      await this.#gitCmd(dir, ["add", "-A"]);
      const coAuthor = input.coAuthor ?? "Nala <nala@forge.local>";
      const message = [
        input.title,
        "",
        `Co-authored-by: ${coAuthor}`,
        `X-Forge-Assignment: ${input.assignmentId}`,
      ].join("\n");
      await this.#gitCmd(dir, ["-c", "user.email=forge@local", "-c", "user.name=FORGE", "commit", "-m", message]);

      const { stdout: shaOut } = await this.#gitCmd(dir, ["rev-parse", "HEAD"]);
      const sha = shaOut.trim();

      await this.#gitCmd(dir, ["push", "-u", "origin", input.headBranch]);

      const pr = await this.#createPullRequest(input);
      const result: OpenPullRequestResult = {
        number: pr.number,
        url: pr.html_url,
        sha,
      };
      this.#idempotency.set(idemKey, result);
      return result;
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  async #createPullRequest(
    input: OpenPullRequestInput,
  ): Promise<{ number: number; html_url: string }> {
    const [owner, repo] = input.repo.split("/");
    if (!owner || !repo) {
      throw new PrPipelineError("pr.invalid_repo", `Invalid repo slug: ${input.repo}`);
    }
    const res = await this.#fetchFn(`${this.#apiBase}/repos/${owner}/${repo}/pulls`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.#token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        title: input.title,
        head: input.headBranch,
        base: input.baseBranch,
        body: input.body,
        draft: false,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new PrPipelineError(
        "pr.create_failed",
        `GitHub pulls.create failed: ${res.status} ${text.slice(0, 200)}`,
      );
    }
    return (await res.json()) as { number: number; html_url: string };
  }

  async #gitCmd(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    // Never put the token in logs — strip https credentials from any error text at call sites.
    return execFileAsync(this.#git, args, {
      cwd,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        // Ensure credential helper cannot leak interactive prompts.
        GIT_ASKPASS: "echo",
      },
      maxBuffer: 10 * 1024 * 1024,
    });
  }
}

/**
 * PANIC / offline path: returns a pre-created PR with the same shape.
 * The linked PR is real (opened at rehearsal); latency is fixed and visible.
 */
export class FakeGitHubPullRequestAdapter implements PullRequestPort {
  readonly #result: OpenPullRequestResult;
  readonly #latencyMs: number;
  readonly #idempotency = new Map<string, OpenPullRequestResult>();
  readonly opened: OpenPullRequestInput[] = [];

  constructor(
    result: OpenPullRequestResult = {
      number: 17,
      url: "https://github.com/acme-payments/acme-store/pull/17",
      sha: "a".repeat(40),
    },
    latencyMs = 80,
  ) {
    this.#result = result;
    this.#latencyMs = latencyMs;
  }

  async openPullRequest(input: OpenPullRequestInput): Promise<OpenPullRequestResult> {
    const key = `${input.assignmentId}:${input.headBranch}`;
    const existing = this.#idempotency.get(key);
    if (existing) return existing;
    this.opened.push(input);
    if (this.#latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.#latencyMs));
    }
    // Validate patch is non-empty so fakes still surface empty-patch bugs.
    if (!input.patch.trim()) {
      throw new PrPipelineError("patch.empty", "Refusing to open PR with empty patch");
    }
    const result = { ...this.#result };
    this.#idempotency.set(key, result);
    return result;
  }
}

export class PrPipelineError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PrPipelineError";
    this.code = code;
  }
}

/** Assemble PR body from records — omit lines when a value cannot be derived. */
export function assemblePrBody(parts: {
  diagnosis?: string;
  impactCustomers?: number;
  impactWindow?: string;
  impactAttempts?: number;
  changes?: string[];
  testsPassing?: string;
  gatesPassing?: string;
  repairCycles?: number;
  ticketId?: string;
  assignmentId?: string;
  notAddressed?: string[];
}): string {
  const lines: string[] = [
    "## Fix annual checkout returning a generic 500",
    "",
  ];
  if (parts.diagnosis) {
    lines.push(parts.diagnosis, "");
  }
  if (parts.impactCustomers != null && parts.impactWindow) {
    const attempts =
      parts.impactAttempts != null ? ` (${parts.impactAttempts} failed attempts)` : "";
    lines.push(
      `**Impact:** ${parts.impactCustomers} distinct customers hit this between ${parts.impactWindow}${attempts}. Monthly checkout is unaffected.`,
      "",
    );
  }
  if (parts.changes?.length) {
    lines.push("### Changes", "");
    for (const change of parts.changes) lines.push(`- ${change}`);
    lines.push("");
  }
  if (parts.testsPassing || parts.gatesPassing) {
    lines.push("### Verification", "");
    const bits = [
      parts.testsPassing,
      parts.gatesPassing,
      parts.repairCycles != null ? `${parts.repairCycles} repair cycle${parts.repairCycles === 1 ? "" : "s"}` : undefined,
    ].filter(Boolean);
    lines.push(bits.join(" · "), "");
  }
  if (parts.notAddressed?.length || parts.ticketId) {
    lines.push("### Not addressed", "");
    if (parts.notAddressed) {
      for (const line of parts.notAddressed) lines.push(line);
    }
    if (parts.ticketId) {
      lines.push(
        `Existing failed sessions are not retried. Ticket ${parts.ticketId} and other affected customers have not been contacted.`,
      );
    }
    lines.push("");
  }
  lines.push("---", "");
  const assignment = parts.assignmentId ? ` · assignment \`${parts.assignmentId}\`` : "";
  lines.push(`Opened by Nala, an AI coworker at Acme Payments${assignment}`);
  return lines.join("\n");
}

export function createPullRequestPort(env: {
  GITHUB_TOKEN?: string | undefined;
  GITHUB_PAT?: string | undefined;
}): { port: PullRequestPort; state: "connected" | "not_configured" } {
  const token = env.GITHUB_TOKEN?.trim() || env.GITHUB_PAT?.trim();
  if (!token) {
    return { port: new FakeGitHubPullRequestAdapter(), state: "not_configured" };
  }
  return { port: new GitHubPullRequestAdapter({ token }), state: "connected" };
}

/** Content hash helper for patch identity in receipts. */
export function patchSha256(patch: string): string {
  return createHash("sha256").update(patch, "utf8").digest("hex");
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    // Strip any accidental token material from git remote URLs in error output.
    return err.message.replace(/x-access-token:[^@\s]+@/g, "x-access-token:***@");
  }
  return String(err);
}

// Re-export readFile for future patch inspection helpers without dead-code noise.
export async function readPatchFile(path: string): Promise<string> {
  return readFile(path, "utf8");
}
