import { describe, expect, it } from "vitest";
import {
  handleZendeskWebhook,
  MemoryWebhookDedupe,
  signZendeskWebhook,
  timingSafeEqualB64,
  ZENDESK_TEST_SIGNING_SECRET,
} from "./webhook";

const SECRET = "unit-test-zendesk-secret";
const NOW = Date.parse("2026-07-23T20:00:00.000Z");
const TS = "2026-07-23T19:59:30.000Z";

function headers(overrides: Partial<{ signature: string; timestamp: string; invocationId: string }> = {}) {
  const rawBody = JSON.stringify({ type: "zen:event-type:ticket.created", detail: { id: 4471 } });
  const timestamp = overrides.timestamp ?? TS;
  const signature =
    overrides.signature ?? signZendeskWebhook(SECRET, timestamp, rawBody);
  return {
    rawBody,
    headers: {
      signature,
      timestamp,
      invocationId: overrides.invocationId ?? "inv_01TEST",
    },
    secret: SECRET,
    nowMs: NOW,
    allowTestSecret: false,
  };
}

describe("timingSafeEqualB64", () => {
  it("accepts equal digests", () => {
    const dig = signZendeskWebhook(SECRET, TS, "{}");
    expect(timingSafeEqualB64(dig, dig)).toBe(true);
  });

  it("rejects unequal digests without throwing", () => {
    const dig = signZendeskWebhook(SECRET, TS, "{}");
    expect(timingSafeEqualB64(dig, "aaaa")).toBe(false);
    expect(timingSafeEqualB64("", dig)).toBe(false);
    expect(timingSafeEqualB64(dig, "")).toBe(false);
  });
});

describe("handleZendeskWebhook", () => {
  it("accepts a valid signature and enqueues once", () => {
    const dedupe = new MemoryWebhookDedupe();
    const result = handleZendeskWebhook({ ...headers(), dedupe });
    expect(result.status).toBe(200);
    expect(result.shouldEnqueue).toBe(true);
    expect(result.invocationId).toBe("inv_01TEST");
  });

  it("rejects a tampered body", () => {
    const base = headers();
    const result = handleZendeskWebhook({
      ...base,
      rawBody: base.rawBody.replace("4471", "9999"),
      dedupe: new MemoryWebhookDedupe(),
    });
    expect(result.status).toBe(401);
    expect(result.body?.code).toBe("webhook.bad_signature");
    expect(result.shouldEnqueue).toBe(false);
  });

  it("rejects an expired timestamp", () => {
    const result = handleZendeskWebhook({
      ...headers({ timestamp: "2026-07-23T18:00:00.000Z" }),
      dedupe: new MemoryWebhookDedupe(),
    });
    expect(result.status).toBe(401);
    expect(result.body?.code).toBe("webhook.expired");
  });

  it("treats a replayed invocation id as a no-op 200", () => {
    const dedupe = new MemoryWebhookDedupe();
    const opts = { ...headers(), dedupe };
    expect(handleZendeskWebhook(opts).shouldEnqueue).toBe(true);
    const replay = handleZendeskWebhook(opts);
    expect(replay.status).toBe(200);
    expect(replay.shouldEnqueue).toBe(false);
  });

  it("does not throw on malformed headers", () => {
    const result = handleZendeskWebhook({
      rawBody: "{}",
      headers: { signature: null, timestamp: null, invocationId: null },
      secret: SECRET,
      nowMs: NOW,
      dedupe: new MemoryWebhookDedupe(),
    });
    expect(result.status).toBe(401);
    expect(result.body?.code).toBe("webhook.malformed");
  });

  it("accepts the documented test secret outside production", () => {
    const rawBody = '{"ping":true}';
    const timestamp = TS;
    const signature = signZendeskWebhook(ZENDESK_TEST_SIGNING_SECRET, timestamp, rawBody);
    const result = handleZendeskWebhook({
      rawBody,
      headers: { signature, timestamp, invocationId: "inv_test_ping" },
      secret: undefined,
      nowMs: NOW,
      allowTestSecret: true,
      dedupe: new MemoryWebhookDedupe(),
    });
    expect(result.status).toBe(200);
    expect(result.shouldEnqueue).toBe(true);
  });

  it("returns 2xx in under a second for the happy path", () => {
    const started = performance.now();
    handleZendeskWebhook({ ...headers(), dedupe: new MemoryWebhookDedupe() });
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});
