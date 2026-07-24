import { createHmac, timingSafeEqual } from "node:crypto";

/** Zendesk documents this static secret for pre-activation test pings. */
export const ZENDESK_TEST_SIGNING_SECRET = "test_signing_secret_for_webhook_verification";

export type WebhookVerifyResult =
  | { ok: true; invocationId: string; rawBody: string }
  | { ok: false; code: "webhook.bad_signature" | "webhook.expired" | "webhook.malformed"; detail?: string };

export interface ZendeskWebhookHeaders {
  signature: string | null;
  timestamp: string | null;
  invocationId: string | null;
  webhookId?: string | null;
  accountId?: string | null;
}

export interface VerifyZendeskWebhookOptions {
  rawBody: string;
  headers: ZendeskWebhookHeaders;
  /** Live signing secret from env. Empty / missing → not_configured path. */
  secret: string | undefined;
  /** Max age of signature timestamp in ms. Default 5 minutes. */
  maxAgeMs?: number;
  /** Injected clock for tests. */
  nowMs?: number;
  /** When true (non-production), also accept the documented test signing secret. */
  allowTestSecret?: boolean;
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
      // Still do a dummy compare so timing is similar on early exit paths.
      const dummy = Buffer.alloc(32);
      timingSafeEqual(dummy, dummy);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function signZendeskWebhook(secret: string, timestamp: string, rawBody: string): string {
  return createHmac("sha256", secret)
    .update(timestamp + rawBody, "utf8")
    .digest("base64");
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
 * In-memory invocation-id store for unit tests and local demo without DB.
 * Production must use unique (provider, invocation_id) in Postgres.
 */
export class MemoryWebhookDedupe {
  readonly #seen = new Map<string, string>();

  /**
   * @returns true if this is the first time seeing the id (caller should enqueue).
   */
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
  /** When true, caller should enqueue handle-zendesk-event. */
  shouldEnqueue: boolean;
  invocationId?: string;
  rawBody?: string;
}

/**
 * Full webhook handle path: verify → dedupe → 2xx fast.
 * Never does ticket work here — enqueue only.
 */
export function handleZendeskWebhook(
  options: VerifyZendeskWebhookOptions & {
    dedupe: { recordOnce(provider: string, invocationId: string, rawBody: string): boolean };
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
