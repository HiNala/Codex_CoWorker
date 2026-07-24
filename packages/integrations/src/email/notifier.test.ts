import { describe, expect, it, vi } from "vitest";
import type { ComposioToolExecutor } from "../composio/client";
import {
  assertEmailBodyBudget,
  ComposioGmailNotifier,
  createNotifier,
  FakeNotifier,
  NotifierError,
  ResendNotifier,
} from "./notifier";

const goodBody = [
  "Annual plan checkout has been failing because the billing interval does not match the price lookup.",
  "I opened a PR that fixes the mismatch and returns a specific 400 instead of a silent 500.",
  "Nine customers hit this in the last week, including Priya who filed ticket #4471.",
  "",
  "PR: https://github.com/acme-payments/acme-store/pull/17",
].join("\n");

const demoScenarioBody = [
  "Annual plan checkout has been failing since Thursday because the billing interval the pricing page sends doesn't match the keys in the price lookup, so nothing ever reached Stripe.",
  "I've opened a PR that fixes the mismatch and makes the failure return a specific 400 instead of a silent 500, with tests covering annual across all three plans.",
  "Nine customers hit this in the last week, including Priya at Northwind who filed ticket #4471 — none of them have been contacted yet.",
  "",
  "PR: https://github.com/acme-payments/acme-store/pull/17",
  "",
  "— Nala",
].join("\n");

describe("assertEmailBodyBudget", () => {
  it("allows three sentences plus a link", () => {
    expect(() => assertEmailBodyBudget(goodBody)).not.toThrow();
  });

  it("allows demo-scenario email with signature", () => {
    expect(() => assertEmailBodyBudget(demoScenarioBody)).not.toThrow();
  });

  it("rejects four sentences", () => {
    expect(() =>
      assertEmailBodyBudget(
        "One. Two. Three. Four sentences is too many for the demo email.",
      ),
    ).toThrow(NotifierError);
  });

  it("rejects empty body", () => {
    expect(() => assertEmailBodyBudget("   ")).toThrow(/empty/i);
  });

  it("allows bare URL link line", () => {
    expect(() =>
      assertEmailBodyBudget("One sentence only.\nhttps://example.test/pr/1"),
    ).not.toThrow();
  });
});

describe("FakeNotifier", () => {
  it("is idempotent on idempotencyKey", async () => {
    const n = new FakeNotifier();
    const input = {
      to: "owner@acme.test",
      subject: "Annual checkout was broken — fix is up for review",
      body: goodBody,
      idempotencyKey: "asg_1:email",
    };
    const a = await n.send(input);
    const b = await n.send(input);
    expect(a.providerId).toBe(b.providerId);
    expect(n.sent).toHaveLength(1);
  });

  it("enforces body budget before send", async () => {
    const n = new FakeNotifier();
    await expect(
      n.send({
        to: "a@b.test",
        subject: "x",
        body: "One. Two. Three. Four.",
        idempotencyKey: "k",
      }),
    ).rejects.toMatchObject({ code: "email.body_too_long" });
  });
});

describe("ResendNotifier", () => {
  it("sends with Idempotency-Key and memoizes", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ id: "re_123" }), { status: 200 }),
    ) as unknown as typeof fetch;

    const n = new ResendNotifier({
      apiKey: "re_test_not_real",
      from: "nala@acme.test",
      fetchFn,
    });

    const input = {
      to: "owner@acme.test",
      subject: "fix ready",
      body: goodBody,
      idempotencyKey: "asg_9:email",
    };
    const a = await n.send(input);
    const b = await n.send(input);
    expect(a.providerId).toBe("re_123");
    expect(b.providerId).toBe("re_123");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const init = (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.headers).toMatchObject({
      "Idempotency-Key": "asg_9:email",
    });
  });

  it("maps non-OK responses to NotifierError", async () => {
    const fetchFn = vi.fn(async () => new Response("nope", { status: 429 })) as unknown as typeof fetch;
    const n = new ResendNotifier({
      apiKey: "re_test",
      from: "a@b.test",
      fetchFn,
    });
    await expect(
      n.send({
        to: "x@y.test",
        subject: "s",
        body: "One sentence only.",
        idempotencyKey: "k1",
      }),
    ).rejects.toMatchObject({ code: "resend.failed" });
  });
});

describe("ComposioGmailNotifier", () => {
  it("sends via injected executeTool and is idempotent", async () => {
    const calls: unknown[] = [];
    const executeTool: ComposioToolExecutor = async (args) => {
      calls.push(args);
      return { providerId: "gmail-msg-1" };
    };
    const n = new ComposioGmailNotifier({
      apiKey: "composio_test_not_real",
      userId: "user_internal_1",
      connectedAccountId: "ca_gmail_1",
      executeTool,
    });
    const input = {
      to: "owner@acme.test",
      subject: "Annual checkout was broken — fix is up for review",
      body: goodBody,
      idempotencyKey: "asg_1:email",
    };
    const a = await n.send(input);
    const b = await n.send(input);
    expect(a.provider).toBe("composio_gmail");
    expect(a.providerId).toBe("gmail-msg-1");
    expect(b.providerId).toBe(a.providerId);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      toolSlug: "GMAIL_SEND_EMAIL",
      userId: "user_internal_1",
      connectedAccountId: "ca_gmail_1",
      arguments: {
        recipient_email: "owner@acme.test",
        subject: input.subject,
        body: goodBody,
      },
    });
  });

  it("refuses live send when account not linked and no inject", async () => {
    const n = new ComposioGmailNotifier({
      apiKey: "composio_test_not_real",
      userId: "user_internal_1",
    });
    await expect(
      n.send({
        to: "o@a.test",
        subject: "s",
        body: "One sentence.",
        idempotencyKey: "k",
      }),
    ).rejects.toMatchObject({ code: "composio.not_linked" });
  });

  it("createConnectLink rejects Node below floor without importing SDK", async () => {
    await expect(
      ComposioGmailNotifier.createConnectLink({
        apiKey: "k",
        userId: "u",
        nodeVersion: "22.12.0",
      }),
    ).rejects.toMatchObject({ code: "composio.node_floor" });
  });
});

describe("createNotifier", () => {
  it("degrades to fake when nothing is configured", () => {
    const { state, provider } = createNotifier({});
    expect(state).toBe("not_configured");
    expect(provider).toBe("fake");
  });

  it("degrades off Composio when account not linked (falls to fake)", () => {
    const { state, provider, detail } = createNotifier({
      COMPOSIO_API_KEY: "present",
      COMPOSIO_USER_ID: "user_1",
      // no COMPOSIO_GMAIL_ACCOUNT_ID
      nodeVersion: "22.22.3",
    });
    expect(state).toBe("not_configured");
    expect(provider).toBe("fake");
    expect(detail).toMatch(/link\(\)|ACCOUNT_ID/i);
  });

  it("falls to Resend when Composio not linked but Resend is set", () => {
    const { state, provider } = createNotifier({
      COMPOSIO_API_KEY: "present",
      COMPOSIO_USER_ID: "user_1",
      RESEND_API_KEY: "re_x",
      RESEND_FROM: "nala@acme.test",
      nodeVersion: "22.22.3",
    });
    expect(state).toBe("connected");
    expect(provider).toBe("resend");
  });

  it("degrades when Node is below Composio floor even if fully keyed", () => {
    const { state, provider, detail } = createNotifier({
      COMPOSIO_API_KEY: "present",
      COMPOSIO_USER_ID: "user_1",
      COMPOSIO_GMAIL_ACCOUNT_ID: "ca_1",
      nodeVersion: "22.12.0",
    });
    expect(state).toBe("not_configured");
    expect(provider).toBe("fake");
    expect(detail).toMatch(/22\.22\.3|floor/i);
  });

  it("selects Composio Gmail when linked + floor met via inject", async () => {
    const executeTool: ComposioToolExecutor = async () => ({ providerId: "g1" });
    const { state, provider, notifier } = createNotifier({
      COMPOSIO_API_KEY: "present",
      COMPOSIO_USER_ID: "user_1",
      COMPOSIO_GMAIL_ACCOUNT_ID: "ca_1",
      nodeVersion: "22.12.0", // inject bypasses floor for tests
      executeTool,
    });
    expect(state).toBe("connected");
    expect(provider).toBe("composio_gmail");
    const r = await notifier.send({
      to: "a@b.test",
      subject: "s",
      body: "Only one sentence here.",
      idempotencyKey: "idem-1",
    });
    expect(r.provider).toBe("composio_gmail");
  });
});
