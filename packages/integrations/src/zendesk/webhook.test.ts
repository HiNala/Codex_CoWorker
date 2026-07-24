import { describe, expect, it } from "vitest";
import {
  createSignedWebhookFixture,
  handleZendeskWebhook,
  handleZendeskWebhookAsync,
  MemoryWebhookDedupe,
  parseZendeskWebhookHeaders,
  signZendeskWebhook,
  timingSafeEqualB64,
  verifyZendeskWebhook,
  ZENDESK_LOCAL_FIXTURE_SECRET,
  ZENDESK_TEST_SIGNING_SECRET,
} from "./webhook";

const SECRET = "unit-test-zendesk-secret";
const NOW = Date.parse("2026-07-23T20:00:00.000Z");
const TS = "2026-07-23T19:59:30.000Z";

function headers(
  overrides: Partial<{ signature: string; timestamp: string; invocationId: string }> = {},
) {
  const rawBody = JSON.stringify({ type: "zen:event-type:ticket.created", detail: { id: 4471 } });
  const timestamp = overrides.timestamp ?? TS;
  const signature = overrides.signature ?? signZendeskWebhook(SECRET, timestamp, rawBody);
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
    expect(timingSafeEqualB64("not-valid-b64!!!", dig)).toBe(false);
    expect(timingSafeEqualB64(dig, "AA==")).toBe(false);
  });

  it("never throws on length mismatch or garbage", () => {
    expect(() => timingSafeEqualB64("a", "bb")).not.toThrow();
    expect(() => timingSafeEqualB64("\u0000", "zzzz")).not.toThrow();
  });
});

describe("parseZendeskWebhookHeaders", () => {
  it("reads standard x-zendesk-* headers from a Headers object", () => {
    const h = new Headers({
      "x-zendesk-webhook-signature": "sig",
      "x-zendesk-webhook-signature-timestamp": TS,
      "x-zendesk-webhook-invocation-id": "inv_1",
      "x-zendesk-webhook-id": "wh_1",
      "x-zendesk-account-id": "acct_1",
    });
    expect(parseZendeskWebhookHeaders(h)).toEqual({
      signature: "sig",
      timestamp: TS,
      invocationId: "inv_1",
      webhookId: "wh_1",
      accountId: "acct_1",
    });
  });

  it("returns nulls for missing headers without throwing", () => {
    expect(parseZendeskWebhookHeaders({})).toEqual({
      signature: null,
      timestamp: null,
      invocationId: null,
      webhookId: null,
      accountId: null,
    });
  });
});

describe("createSignedWebhookFixture", () => {
  it("produces a locally signed payload with no env dependency", () => {
    const fixture = createSignedWebhookFixture({
      nowMs: NOW,
      timestamp: TS,
      invocationId: "inv_local",
    });
    expect(fixture.secret).toBe(ZENDESK_LOCAL_FIXTURE_SECRET);
    expect(process.env.ZENDESK_WEBHOOK_SECRET).toBeFalsy();

    const result = handleZendeskWebhook({
      rawBody: fixture.rawBody,
      headers: fixture.headers,
      secret: fixture.secret,
      nowMs: fixture.nowMs,
      allowTestSecret: false,
      dedupe: new MemoryWebhookDedupe(),
    });
    expect(result.status).toBe(200);
    expect(result.shouldEnqueue).toBe(true);
    expect(result.invocationId).toBe("inv_local");
  });

  it("HMAC is over timestamp + rawBody (not re-serialised JSON)", () => {
    const rawBody = '{"a":1,"b":2}';
    const reordered = '{"b":2,"a":1}';
    const sig = signZendeskWebhook(SECRET, TS, rawBody);
    expect(timingSafeEqualB64(sig, signZendeskWebhook(SECRET, TS, rawBody))).toBe(true);
    expect(timingSafeEqualB64(sig, signZendeskWebhook(SECRET, TS, reordered))).toBe(false);
  });
});

describe("verifyZendeskWebhook", () => {
  it("rejects wrong secret", () => {
    const base = headers();
    const result = verifyZendeskWebhook({
      ...base,
      secret: "wrong-secret",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("webhook.bad_signature");
  });

  it("rejects far-future timestamp", () => {
    const future = "2026-07-23T21:00:00.000Z";
    const result = verifyZendeskWebhook({
      ...headers({ timestamp: future }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("webhook.expired");
  });

  it("rejects non-ISO timestamp as malformed", () => {
    const result = verifyZendeskWebhook({
      rawBody: "{}",
      headers: {
        signature: "AA==",
        timestamp: "not-a-date",
        invocationId: "inv_x",
      },
      secret: SECRET,
      nowMs: NOW,
      allowTestSecret: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("webhook.malformed");
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

  it("rejects a wrong signature header", () => {
    const result = handleZendeskWebhook({
      ...headers({ signature: signZendeskWebhook(SECRET, TS, "other-body") }),
      dedupe: new MemoryWebhookDedupe(),
    });
    expect(result.status).toBe(401);
    expect(result.body?.code).toBe("webhook.bad_signature");
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

  it("does not throw on empty signature strings", () => {
    expect(() =>
      handleZendeskWebhook({
        rawBody: "{}",
        headers: { signature: "", timestamp: "", invocationId: "" },
        secret: SECRET,
        nowMs: NOW,
        dedupe: new MemoryWebhookDedupe(),
      }),
    ).not.toThrow();
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

  it("enqueues signal only — result never embeds ticket work fields", () => {
    const result = handleZendeskWebhook({ ...headers(), dedupe: new MemoryWebhookDedupe() });
    expect(result).toMatchObject({
      status: 200,
      body: null,
      shouldEnqueue: true,
    });
    expect(Object.keys(result).sort()).toEqual(
      ["body", "invocationId", "rawBody", "shouldEnqueue", "status"].sort(),
    );
  });
});

describe("handleZendeskWebhookAsync", () => {
  it("supports async dedupe stores (prod unique-index shape)", async () => {
    const seen = new Set<string>();
    const dedupe = {
      async recordOnce(provider: string, invocationId: string): Promise<boolean> {
        const key = `${provider}:${invocationId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      },
    };
    const first = await handleZendeskWebhookAsync({ ...headers(), dedupe });
    const second = await handleZendeskWebhookAsync({ ...headers(), dedupe });
    expect(first.shouldEnqueue).toBe(true);
    expect(second.status).toBe(200);
    expect(second.shouldEnqueue).toBe(false);
  });
});
