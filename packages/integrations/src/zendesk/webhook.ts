import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Zendesk documents this static secret for pre-activation test pings.
 * Accept only when allowTestSecret / non-production (never as sole prod secret).
 */
export const ZENDESK_TEST_SIGNING_SECRET = "test_signing_secret_for_webhook_verification";

/**
 * Well-known local fixture secret for unit/integration tests.
 * Sign fixture payloads with {@link signZendeskWebhook} / {@link createSignedWebhookFixture}.
 * Live `ZENDESK_WEBHOOK_SECRET` is optional — when unset, handlers use this path via
 * injected secret in tests; production wiring is env-only (no code change beyond config).
 */
export const ZENDESK_LOCAL_FIXTURE_SECRET = "forge_local_zendesk_webhook_fixture_secret";

export type WebhookVerifyResult =
  | { ok: true; invocationId: string; rawBody: string }
  | {
      ok: false;
      code: "webhook.bad_signature" | "webhook.expired" | "webhook.malformed";
      detail?: string;
    };

export interface ZendeskWebhookHeaders {
  signature: string | null;
  timestamp: string | null;
  invocationId: string | null;
  webhookId?: string | null;
  accountId?: string | null;
}

export interface VerifyZendeskWebhookOptions {
  /**
   * RAW request body bytes as UTF-8 string, captured BEFORE any JSON.parse.
   * Framework body parsers that re-serialise JSON will break HMAC verification.
   * In Next.js route handlers: `const rawBody = await req.text()` then parse if needed.
   */
  rawBody: string;
  headers: ZendeskWebhookHeaders;
  /** Live signing secret from env. Empty / missing → test secret path only when allowed. */
  secret: string | undefined;
  /** Max age of signature timestamp in ms. Default 5 minutes. */
  maxAgeMs?: number;
  /** Injected clock for tests. */
  nowMs?: number;
  /** When true (non-production), also accept the documented Zendesk test signing secret. */
  allowTestSecret?: boolean;
}

/**
 * Map HTTP headers (case-insensitive Headers or plain object) into the verify shape.
 * Never throws on missing/malformed values — verification returns webhook.malformed.
 */
export function parseZendeskWebhookHeaders(
  source: Headers | Record<string, string | null | undefined>,
): ZendeskWebhookHeaders {
  const get = (name: string): string | null => {
    if (typeof (source as Headers).get === "function") {
      return (source as Headers).get(name);
    }
    const record = source as Record<string, string | null | undefined>;
    const direct = record[name] ?? record[name.toLowerCase()];
    if (direct != null && direct !== "") return direct;
    // Case-insensitive fallback for plain objects.
    const lower = name.toLowerCase();
    for (const [key, value] of Object.entries(record)) {
      if (key.toLowerCase() === lower && value != null && value !== "") return value;
    }
    return null;
  };

  return {
    signature: get("x-zendesk-webhook-signature"),
    timestamp: get("x-zendesk-webhook-signature-timestamp"),
    invocationId: get("x-zendesk-webhook-invocation-id"),
    webhookId: get("x-zendesk-webhook-id"),
    accountId: get("x-zendesk-account-id"),
  };
}

/**
 * Constant-time base64 HMAC compare that never throws on length mismatch.
 * Re-serialising parsed JSON changes bytes and breaks the digest — always
 * pass the raw body captured before JSON.parse.
 */
export function timingSafeEqualB64(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "base64");
    const bufB = Buffer.from(b, "base64");
    if (bufA.length === 0 || bufB.length === 0 || bufA.length !== bufB.length) {
      // Dummy compare so early-exit paths still touch timingSafeEqual.
      const dummy = Buffer.alloc(32);
      timingSafeEqual(dummy, dummy);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Zendesk signing scheme:
 * `base64(HMAC-SHA256(timestamp + rawBody, secret))`
 * compared to `x-zendesk-webhook-signature`.
 */
export function signZendeskWebhook(secret: string, timestamp: string, rawBody: string): string {
  return createHmac("sha256", secret)
    .update(timestamp + rawBody, "utf8")
    .digest("base64");
}

/**
 * Build a fully signed fixture for unit tests — no ZENDESK_* env required.
 * Use {@link ZENDESK_LOCAL_FIXTURE_SECRET} (or any secret) so the verify path is exercised end-to-end.
 */
export function createSignedWebhookFixture(options: {
  rawBody?: string;
  timestamp?: string;
  invocationId?: string;
  secret?: string;
  nowMs?: number;
}): {
  rawBody: string;
  headers: ZendeskWebhookHeaders;
  secret: string;
  nowMs: number;
  signature: string;
} {
  const secret = options.secret ?? ZENDESK_LOCAL_FIXTURE_SECRET;
  const nowMs = options.nowMs ?? Date.now();
  const timestamp = options.timestamp ?? new Date(nowMs - 5_000).toISOString();
  const rawBody =
    options.rawBody ??
    JSON.stringify({
      type: "zen:event-type:ticket.created",
      detail: { id: 4471, subject: "fixture" },
    });
  const invocationId = options.invocationId ?? "inv_fixture_01";
  const signature = signZendeskWebhook(secret, timestamp, rawBody);

  return {
    rawBody,
    headers: {
      signature,
      timestamp,
      invocationId,
      webhookId: "wh_fixture",
      accountId: "acct_fixture",
    },
    secret,
    nowMs,
    signature,
  };
}

export function verifyZendeskWebhook(options: VerifyZendeskWebhookOptions): WebhookVerifyResult {
  const {
    rawBody,
    headers,
    secret,
    maxAgeMs = 5 * 60_000,
    nowMs = Date.now(),
    allowTestSecret = process.env.NODE_ENV !== "production",
  } = options;

  const { signature, timestamp, invocationId } = headers;

  if (!signature || !timestamp || !invocationId) {
    return { ok: false, code: "webhook.malformed", detail: "missing required signature headers" };
  }

  const parsedTs = Date.parse(timestamp);
  if (Number.isNaN(parsedTs)) {
    return { ok: false, code: "webhook.malformed", detail: "invalid signature timestamp" };
  }

  if (nowMs - parsedTs > maxAgeMs) {
    return { ok: false, code: "webhook.expired" };
  }

  // Reject far-future timestamps as well (clock skew tolerance 60s).
  if (parsedTs - nowMs > 60_000) {
    return { ok: false, code: "webhook.expired", detail: "timestamp in the future" };
  }

  const candidates: string[] = [];
  if (secret && secret.length > 0) {
    candidates.push(secret);
  }
  if (allowTestSecret) {
    candidates.push(ZENDESK_TEST_SIGNING_SECRET);
  }

  if (candidates.length === 0) {
    return { ok: false, code: "webhook.malformed", detail: "no signing secret configured" };
  }

  const matched = candidates.some((candidate) => {
    const expected = signZendeskWebhook(candidate, timestamp, rawBody);
    return timingSafeEqualB64(signature, expected);
  });

  if (!matched) {
    return { ok: false, code: "webhook.bad_signature" };
  }

  return { ok: true, invocationId, rawBody };
}

/**
 * Deduplication port for webhook invocation IDs.
 *
 * Production: insert into `webhook_receipts` with unique index
 * `webhook_receipts_provider_invocation_idx` on `(provider, invocation_id)`
 * (see packages/db schema). On unique violation → already seen → 200 no-op.
 *
 * Tests / local without DB: {@link MemoryWebhookDedupe}.
 */
export interface WebhookDedupe {
  /**
   * @returns true if this is the first time seeing the id (caller should enqueue).
   * @returns false if already recorded (replay / Zendesk retry).
   */
  recordOnce(provider: string, invocationId: string, rawBody: string): boolean | Promise<boolean>;
}

/**
 * In-memory invocation-id store for unit tests and local demo without DB.
 * Production must use unique (provider, invocation_id) in Postgres — see WebhookDedupe.
 */
export class MemoryWebhookDedupe implements WebhookDedupe {
  readonly #seen = new Map<string, string>();

  recordOnce(provider: string, invocationId: string, rawBody: string): boolean {
    const key = `${provider}:${invocationId}`;
    if (this.#seen.has(key)) return false;
    this.#seen.set(key, rawBody);
    return true;
  }

  has(provider: string, invocationId: string): boolean {
    return this.#seen.has(`${provider}:${invocationId}`);
  }

  clear(): void {
    this.#seen.clear();
  }
}

export interface ZendeskWebhookHandleResult {
  status: 200 | 401;
  body: null | { code: string; detail?: string };
  /** When true, caller should enqueue handle-zendesk-event only — never ticket work inline. */
  shouldEnqueue: boolean;
  invocationId?: string;
  rawBody?: string;
}

/**
 * Full webhook handle path: verify → dedupe → 2xx fast.
 * Never does ticket work here — enqueue signal only so the handler returns under ~1s.
 *
 * Caller contract for HTTP:
 * 1. `const rawBody = await req.text()`  // BEFORE JSON.parse
 * 2. `parseZendeskWebhookHeaders(req.headers)`
 * 3. `handleZendeskWebhook({ rawBody, headers, secret, dedupe })`
 * 4. if shouldEnqueue → enqueue job; always return status from result
 */
export function handleZendeskWebhook(
  options: VerifyZendeskWebhookOptions & {
    dedupe: WebhookDedupe;
  },
): ZendeskWebhookHandleResult {
  const verified = verifyZendeskWebhook(options);
  if (!verified.ok) {
    return {
      status: 401,
      body: { code: verified.code, ...(verified.detail ? { detail: verified.detail } : {}) },
      shouldEnqueue: false,
    };
  }

  const inserted = options.dedupe.recordOnce("zendesk", verified.invocationId, verified.rawBody);
  // Dedupe is sync in MemoryWebhookDedupe; prod adapters may be sync insert+catch.
  // If a Promise is returned, caller should use handleZendeskWebhookAsync instead.
  if (typeof inserted !== "boolean") {
    throw new Error(
      "handleZendeskWebhook requires a synchronous WebhookDedupe; use handleZendeskWebhookAsync for async stores",
    );
  }

  // Already seen — still 200 so Zendesk stops retrying.
  if (!inserted) {
    return { status: 200, body: null, shouldEnqueue: false, invocationId: verified.invocationId };
  }

  return {
    status: 200,
    body: null,
    shouldEnqueue: true,
    invocationId: verified.invocationId,
    rawBody: verified.rawBody,
  };
}

/**
 * Async variant when production dedupe hits Postgres unique index.
 * Same semantics as {@link handleZendeskWebhook}.
 */
export async function handleZendeskWebhookAsync(
  options: VerifyZendeskWebhookOptions & {
    dedupe: WebhookDedupe;
  },
): Promise<ZendeskWebhookHandleResult> {
  const verified = verifyZendeskWebhook(options);
  if (!verified.ok) {
    return {
      status: 401,
      body: { code: verified.code, ...(verified.detail ? { detail: verified.detail } : {}) },
      shouldEnqueue: false,
    };
  }

  const inserted = await options.dedupe.recordOnce(
    "zendesk",
    verified.invocationId,
    verified.rawBody,
  );

  if (!inserted) {
    return { status: 200, body: null, shouldEnqueue: false, invocationId: verified.invocationId };
  }

  return {
    status: 200,
    body: null,
    shouldEnqueue: true,
    invocationId: verified.invocationId,
    rawBody: verified.rawBody,
  };
}
