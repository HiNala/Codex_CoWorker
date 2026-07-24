/**
 * Notifier port — Composio Gmail primary, Resend fallback.
 * Both go through ExternalActionProposal → approval → execute.
 * Backend sends exact approved arguments; never regenerates the body.
 */

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

/** Schema-level cap: three sentences + optional link line. */
export function assertEmailBodyBudget(body: string): void {
  const trimmed = body.trim();
  // Split on sentence terminators; allow a trailing PR link line.
  const withoutLinks = trimmed
    .split("\n")
    .filter((line) => !/^https?:\/\//i.test(line.trim()) && !/^PR:/i.test(line.trim()))
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
      throw new NotifierError("resend.failed", `Resend send failed: ${res.status} ${text.slice(0, 120)}`);
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
 * failure on hosts below the engine floor). Live send uses dynamic import.
 */
export interface ComposioGmailConfig {
  apiKey: string;
  /** Immutable internal user id — never an email address. */
  userId: string;
  /** Connected account id held by Composio after OAuth link(). */
  connectedAccountId?: string;
  /**
   * Injected tool executor for tests. Live path uses Composio tools.execute.
   */
  executeTool?: (args: {
    toolSlug: string;
    arguments: Record<string, unknown>;
    connectedAccountId?: string;
    userId: string;
  }) => Promise<{ providerId: string }>;
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
   */
  static async createConnectLink(input: {
    apiKey: string;
    userId: string;
    callbackUrl?: string;
  }): Promise<{ redirectUrl: string; connectionRequestId?: string }> {
    // Dynamic import keeps package loadable when @composio/core is absent.
    const { Composio } = await import("@composio/core").catch(() => {
      throw new NotifierError(
        "composio.sdk_missing",
        "@composio/core is not installed; cannot start OAuth link flow",
      );
    });
    const composio = new Composio({ apiKey: input.apiKey });
    const connectionRequest = await composio.connectedAccounts.link(input.userId, "gmail", {
      callbackUrl: input.callbackUrl,
    });
    const redirectUrl =
      (connectionRequest as { redirectUrl?: string; redirect_url?: string }).redirectUrl ??
      (connectionRequest as { redirect_url?: string }).redirect_url;
    if (!redirectUrl) {
      throw new NotifierError("composio.link_failed", "connectedAccounts.link() returned no redirectUrl");
    }
    return {
      redirectUrl,
      connectionRequestId: (connectionRequest as { id?: string }).id,
    };
  }

  async send(input: NotifierSendInput): Promise<NotifierSendResult> {
    assertEmailBodyBudget(input.body);
    const cached = this.#results.get(input.idempotencyKey);
    if (cached) return cached;

    let providerId: string;
    if (this.#config.executeTool) {
      const out = await this.#config.executeTool({
        toolSlug: "GMAIL_SEND_EMAIL",
        userId: this.#config.userId,
        connectedAccountId: this.#config.connectedAccountId,
        arguments: {
          recipient_email: input.to,
          subject: input.subject,
          body: input.body,
        },
      });
      providerId = out.providerId;
    } else {
      const { Composio } = await import("@composio/core").catch(() => {
        throw new NotifierError(
          "composio.sdk_missing",
          "@composio/core is not installed; cannot send via Gmail",
        );
      });
      const composio = new Composio({ apiKey: this.#config.apiKey });
      const result = await composio.tools.execute("GMAIL_SEND_EMAIL", {
        userId: this.#config.userId,
        connectedAccountId: this.#config.connectedAccountId,
        arguments: {
          recipient_email: input.to,
          subject: input.subject,
          body: input.body,
        },
        dangerouslySkipVersionCheck: true,
      });
      providerId =
        (result as { data?: { id?: string }; id?: string }).data?.id ??
        (result as { id?: string }).id ??
        input.idempotencyKey;
    }

    const out: NotifierSendResult = {
      providerId,
      sentAt: new Date().toISOString(),
      provider: "composio_gmail",
    };
    this.#results.set(input.idempotencyKey, out);
    return out;
  }
}

/** Prefer Composio Gmail when configured; else Resend; else fake. */
export function createNotifier(env: {
  COMPOSIO_API_KEY?: string | undefined;
  COMPOSIO_USER_ID?: string | undefined;
  COMPOSIO_GMAIL_ACCOUNT_ID?: string | undefined;
  RESEND_API_KEY?: string | undefined;
  RESEND_FROM?: string | undefined;
}): { notifier: Notifier; state: "connected" | "not_configured"; provider: string } {
  if (env.COMPOSIO_API_KEY?.trim() && env.COMPOSIO_USER_ID?.trim()) {
    return {
      notifier: new ComposioGmailNotifier({
        apiKey: env.COMPOSIO_API_KEY,
        userId: env.COMPOSIO_USER_ID,
        connectedAccountId: env.COMPOSIO_GMAIL_ACCOUNT_ID,
      }),
      state: env.COMPOSIO_GMAIL_ACCOUNT_ID ? "connected" : "not_configured",
      provider: "composio_gmail",
    };
  }
  if (env.RESEND_API_KEY?.trim() && env.RESEND_FROM?.trim()) {
    return {
      notifier: new ResendNotifier({
        apiKey: env.RESEND_API_KEY,
        from: env.RESEND_FROM,
      }),
      state: "connected",
      provider: "resend",
    };
  }
  return { notifier: new FakeNotifier(), state: "not_configured", provider: "fake" };
}
