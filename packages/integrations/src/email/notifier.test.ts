import { describe, expect, it } from "vitest";
import {
  assertEmailBodyBudget,
  createNotifier,
  FakeNotifier,
  NotifierError,
} from "./notifier";

const goodBody = [
  "Annual plan checkout has been failing because the billing interval does not match the price lookup.",
  "I opened a PR that fixes the mismatch and returns a specific 400 instead of a silent 500.",
  "Nine customers hit this in the last week, including Priya who filed ticket #4471.",
  "",
  "PR: https://github.com/acme-payments/acme-store/pull/17",
].join("\n");

describe("assertEmailBodyBudget", () => {
  it("allows three sentences plus a link", () => {
    expect(() => assertEmailBodyBudget(goodBody)).not.toThrow();
  });

  it("rejects four sentences", () => {
    expect(() =>
      assertEmailBodyBudget(
        "One. Two. Three. Four sentences is too many for the demo email.",
      ),
    ).toThrow(NotifierError);
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
});

describe("createNotifier", () => {
  it("degrades to fake when nothing is configured", () => {
    const { state, provider } = createNotifier({});
    expect(state).toBe("not_configured");
    expect(provider).toBe("fake");
  });
});
