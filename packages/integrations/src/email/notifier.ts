/**
 * Notifier port — Composio Gmail primary, Resend fallback, Fake when unset.
 *
 * External writes go ExternalActionProposal → approval → execute.
 * Backend sends exact approved arguments; never regenerates the body.
 *
 * Composio auth: connectedAccounts.link() (initiate() retired 2026-07-03).
 * SDK is ESM-only, Node 22.22.3+ — factory degrades when floor not met or
 * Gmail account is not linked.
 */

import {
  composioLiveReady,
  createComposioConnectLink,
  createLiveComposioToolExecutor,
  meetsComposioNodeFloor,
  type ComposioToolExecutor,
} from "../composio/client";
import { gmailSend } from "../composio/gmail";

export interface Notifier {
  send(input: NotifierSendInput): Promise<NotifierSendResult>;
}

export interface NotifierSendInput {
  to: string;
  subject: string;
  body: string;
  idempotencyKey: string;
}

export interface NotifierSendResult {
  providerId: string;
  sentAt: string;
  provider: "composio_gmail" | "resend" | "fake";
}

/**
 * Schema-level cap: three sentences + optional link line(s).
 * Enforced here so model restraint is not the only gate.
 *
 * Lines ignored for the sentence count:
 * - bare https?:// URLs
 * - `PR: https://...` lines
 * - signature lines starting with em-dash or "- Nala"
 */
export function assertEmailBodyBudget(body: string): void {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new NotifierError("email.body_empty", "Email body must not be empty");
  }

  const withoutLinks = trimmed
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t) return false;
      if (/^https?:\/\//i.test(t)) return false;
      if (/^PR:\s*https?:\/\//i.test(t)) return false;
      // Unicode em dash (U+2014) or ASCII signature forms
      if (/^[\u2014—]\s*/.test(t)) return false;
      if (/^-\s*Nala\b/i.test(t)) return false;
      return true;
    })
    .join(" ")
    .trim();

  const sentences = withoutLinks
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length > 3) {
    throw new NotifierError(
      "email.body_too_long",
      `Email body has ${sentences.length} sentences; max is 3 plus a link`,
    );
  }
  if (sentences.length === 0) {
    throw new NotifierError(
      "email.body_empty",
      "Email body has no sentences after stripping link/signature lines",
    );
  }
}

export class NotifierError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "NotifierError";
    this.code = code;
  }
}

export class FakeNotifier implements Notifier {
  readonly sent: NotifierSendInput[] = [];
  readonly #results = new Map<string, NotifierSendResult>();

  async send(input: NotifierSendInput): Promise<NotifierSendResult> {
    assertEmailBodyBudget(input.body);
    const cached = this.#results.get(input.idempotencyKey);
    if (cached) return cached;
    this.sent.push(input);
    const result: NotifierSendResult = {
      providerId: `fake-msg-${this.sent.length}`,
      sentAt: new Date().toISOString(),
      provider: "fake",
    };
    this.#results.set(input.idempotencyKey, result);
    return result;
  }
}

export interface ResendConfig {
  apiKey: string;
  from: string;
  fetchFn?: typeof fetch;
  apiBaseUrl?: string;
}

export class ResendNotifier implements Notifier {
  readonly #apiKey: string;
  readonly #from: string;
  readonly #fetchFn: typeof fetch;
  readonly #apiBase: string;
  readonly #results = new Map<string, NotifierSendResult>();

  constructor(config: ResendConfig) {
    this.#apiKey = config.apiKey;
    this.#from = config.from;
    this.#fetchFn = config.fetchFn ?? fetch;
    this.#apiBase = config.apiBaseUrl ?? "https://api.resend.com";
  }

  async send(input: NotifierSendInput): Promise<NotifierSendResult> {
    assertEmailBodyBudget(input.body);
    const cached = this.#results.get(input.idempotencyKey);
    if (cached) return cached;

    const res = await this.#fetchFn(`${this.#apiBase}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from: this.#from,
        to: [input.to],
        subject: input.subject,
        text: input.body,
        headers: { "Idempotency-Key": input.idempotencyKey },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new NotifierError(
        "resend.failed",
        `Resend send failed: ${res.status} ${text.slice(0, 120)}`,
      );
    }

    const data = (await res.json()) as { id?: string };
    const result: NotifierSendResult = {
      providerId: data.id ?? input.idempotencyKey,
      sentAt: new Date().toISOString(),
      provider: "resend",
    };
    this.#results.set(input.idempotencyKey, result);
    return result;
  }
}

/**
 * Composio Gmail notifier.
 * Auth: connectedAccounts.link() — initiate() was retired 2026-07-03.
 * SDK is ESM-only, Node 22.22.3+.
 *
 * When COMPOSIO_API_KEY is missing we do not import the SDK (avoids hard
 * failure on hosts below the engine floor). Live send uses dynamic import
 * or an injected executeTool for tests.
 */
export interface ComposioGmailConfig {
  apiKey: string;
  /** Immutable internal user id — never an email address. */
  userId: string;
  /** Connected account id held by Composio after OAuth link(). Required for live send. */
  connectedAccountId?: string | undefined;
  /**
   * Injected tool executor for tests. Live path uses Composio tools.execute.
   */
  executeTool?: ComposioToolExecutor | undefined;
}

export class ComposioGmailNotifier implements Notifier {
  readonly #config: ComposioGmailConfig;
  readonly #results = new Map<string, NotifierSendResult>();

  constructor(config: ComposioGmailConfig) {
    this.#config = config;
  }

  /**
   * Start managed-OAuth via connectedAccounts.link() (not initiate()).
   * Returns a hosted redirect URL the operator opens once.
   * @see createComposioConnectLink for the full operator checklist.
   */
  static async createConnectLink(input: {
    apiKey: string;
    userId: string;
    callbackUrl?: string | undefined;
    nodeVersion?: string | undefined;
  }): Promise<{ redirectUrl: string; connectionRequestId?: string | undefined }> {
    try {
      return await createComposioConnectLink({
        apiKey: input.apiKey,
        userId: input.userId,
        toolkit: "gmail",
        callbackUrl: input.callbackUrl,
        nodeVersion: input.nodeVersion,
      });
    } catch (err) {
      if (err instanceof NotifierError) throw err;
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: unknown }).code)
          : "composio.link_failed";
      const message = err instanceof Error ? err.message : "link() failed";
      throw new NotifierError(code, message);
    }
  }

  async send(input: NotifierSendInput): Promise<NotifierSendResult> {
    assertEmailBodyBudget(input.body);
    const cached = this.#results.get(input.idempotencyKey);
    if (cached) return cached;

    if (!this.#config.connectedAccountId?.trim() && !this.#config.executeTool) {
      throw new NotifierError(
        "composio.not_linked",
        "Gmail account not linked — run connectedAccounts.link() and set COMPOSIO_GMAIL_ACCOUNT_ID",
      );
    }

    const executeTool: ComposioToolExecutor =
      this.#config.executeTool ?? createLiveComposioToolExecutor(this.#config.apiKey);

    let providerId: string;
    try {
      const out = await gmailSend({
        to: input.to,
        subject: input.subject,
        body: input.body,
        userId: this.#config.userId,
        connectedAccountId: this.#config.connectedAccountId,
        executeTool,
      });
      providerId = out.providerId;
    } catch (err) {
      if (err instanceof NotifierError) throw err;
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: unknown }).code)
          : "composio.send_failed";
      const message = err instanceof Error ? err.message : "Gmail send failed";
      throw new NotifierError(code, message);
    }

    const out: NotifierSendResult = {
      providerId: providerId || input.idempotencyKey,
      sentAt: new Date().toISOString(),
      provider: "composio_gmail",
    };
    this.#results.set(input.idempotencyKey, out);
    return out;
  }
}

export type CreateNotifierEnv = {
  COMPOSIO_API_KEY?: string | undefined;
  COMPOSIO_USER_ID?: string | undefined;
  COMPOSIO_GMAIL_ACCOUNT_ID?: string | undefined;
  RESEND_API_KEY?: string | undefined;
  RESEND_FROM?: string | undefined;
  /** Override process.versions.node for tests / honest degrade. */
  nodeVersion?: string | undefined;
  /** Test-only injectable for Composio path. */
  executeTool?: ComposioToolExecutor;
};

/**
 * Prefer Composio Gmail when fully linked + Node floor met;
 * else Resend; else Fake with not_configured.
 *
 * Partial Composio config (API key without linked account) does NOT select
 * Composio — it falls through so demos stay on Resend/Fake without silent fail.
 */
export function createNotifier(env: CreateNotifierEnv): {
  notifier: Notifier;
  state: "connected" | "not_configured";
  provider: string;
  detail?: string;
} {
  const live = composioLiveReady({
    COMPOSIO_API_KEY: env.COMPOSIO_API_KEY,
    COMPOSIO_USER_ID: env.COMPOSIO_USER_ID,
    COMPOSIO_GMAIL_ACCOUNT_ID: env.COMPOSIO_GMAIL_ACCOUNT_ID,
    nodeVersion: env.nodeVersion,
  });

  // Test injection may force Composio path without Node floor / live SDK.
  if (
    env.executeTool &&
    env.COMPOSIO_API_KEY?.trim() &&
    env.COMPOSIO_USER_ID?.trim() &&
    env.COMPOSIO_GMAIL_ACCOUNT_ID?.trim()
  ) {
    return {
      notifier: new ComposioGmailNotifier({
        apiKey: env.COMPOSIO_API_KEY,
        userId: env.COMPOSIO_USER_ID,
        connectedAccountId: env.COMPOSIO_GMAIL_ACCOUNT_ID,
        executeTool: env.executeTool,
      }),
      state: "connected",
      provider: "composio_gmail",
      detail: "Composio Gmail (injected executor)",
    };
  }

  if (live.ready) {
    return {
      notifier: new ComposioGmailNotifier({
        apiKey: env.COMPOSIO_API_KEY!,
        userId: env.COMPOSIO_USER_ID!,
        connectedAccountId: env.COMPOSIO_GMAIL_ACCOUNT_ID,
      }),
      state: "connected",
      provider: "composio_gmail",
      detail: "Composio Gmail primary",
    };
  }

  // Key present but not linked / node floor: prefer Resend over a half-wired Composio.
  if (env.RESEND_API_KEY?.trim() && env.RESEND_FROM?.trim()) {
    return {
      notifier: new ResendNotifier({
        apiKey: env.RESEND_API_KEY,
        from: env.RESEND_FROM,
      }),
      state: "connected",
      provider: "resend",
      detail: env.COMPOSIO_API_KEY?.trim() ? `Resend fallback (${live.reason})` : "Resend fallback",
    };
  }

  const nodeOk = meetsComposioNodeFloor(env.nodeVersion ?? process.versions.node);
  return {
    notifier: new FakeNotifier(),
    state: "not_configured",
    provider: "fake",
    detail:
      !nodeOk && env.COMPOSIO_API_KEY?.trim()
        ? live.reason
        : live.reason !== "COMPOSIO_API_KEY not set"
          ? live.reason
          : "using FakeNotifier",
  };
}
