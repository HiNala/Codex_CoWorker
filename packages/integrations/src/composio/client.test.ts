import { describe, expect, it } from "vitest";
import {
  COMPOSIO_NODE_FLOOR,
  ComposioError,
  composioLiveReady,
  createComposioConnectLink,
  meetsComposioNodeFloor,
  parseSemver,
  type LoadedComposioClient,
} from "./client";
import {
  GMAIL_FETCH_TOOL,
  GMAIL_REPLY_TOOL,
  GMAIL_SEND_TOOL,
  gmailReadRecent,
  gmailReply,
  gmailSend,
} from "./gmail";

describe("meetsComposioNodeFloor", () => {
  it(`accepts ${COMPOSIO_NODE_FLOOR} and above`, () => {
    expect(meetsComposioNodeFloor("22.22.3")).toBe(true);
    expect(meetsComposioNodeFloor("22.22.4")).toBe(true);
    expect(meetsComposioNodeFloor("23.0.0")).toBe(true);
  });

  it("rejects hosts below the floor (e.g. 22.12.0)", () => {
    expect(meetsComposioNodeFloor("22.12.0")).toBe(false);
    expect(meetsComposioNodeFloor("22.22.2")).toBe(false);
    expect(meetsComposioNodeFloor("20.11.0")).toBe(false);
  });
});

describe("parseSemver", () => {
  it("parses leading triple", () => {
    expect(parseSemver("22.22.3-pre")).toEqual([22, 22, 3]);
  });
  it("returns null on garbage", () => {
    expect(parseSemver("nope")).toBeNull();
  });
});

describe("composioLiveReady", () => {
  it("requires key, user, linked account, and node floor", () => {
    expect(composioLiveReady({}).ready).toBe(false);
    expect(
      composioLiveReady({
        COMPOSIO_API_KEY: "k",
        COMPOSIO_USER_ID: "u",
        nodeVersion: "22.22.3",
      }).reason,
    ).toMatch(/ACCOUNT_ID|link/i);
    expect(
      composioLiveReady({
        COMPOSIO_API_KEY: "k",
        COMPOSIO_USER_ID: "u",
        COMPOSIO_GMAIL_ACCOUNT_ID: "ca",
        nodeVersion: "22.12.0",
      }).ready,
    ).toBe(false);
    expect(
      composioLiveReady({
        COMPOSIO_API_KEY: "k",
        COMPOSIO_USER_ID: "u",
        COMPOSIO_GMAIL_ACCOUNT_ID: "ca",
        nodeVersion: "22.22.3",
      }),
    ).toEqual({ ready: true, reason: "ok" });
  });
});

describe("createComposioConnectLink", () => {
  it("uses connectedAccounts.link() not initiate()", async () => {
    const calls: Array<{ userId: string; toolkit: string }> = [];
    const client: LoadedComposioClient = {
      connectedAccounts: {
        link: async (userId, toolkit) => {
          calls.push({ userId, toolkit });
          return { redirectUrl: "https://connect.composio.dev/link/test", id: "req_1" };
        },
      },
      tools: {
        execute: async () => ({ id: "noop" }),
      },
    };

    const result = await createComposioConnectLink({
      apiKey: "k",
      userId: "user_internal",
      toolkit: "gmail",
      client,
      nodeVersion: "22.22.3",
    });

    expect(result.redirectUrl).toContain("https://");
    expect(result.connectionRequestId).toBe("req_1");
    expect(calls).toEqual([{ userId: "user_internal", toolkit: "gmail" }]);
  });

  it("fails on node floor before any SDK work", async () => {
    await expect(
      createComposioConnectLink({
        apiKey: "k",
        userId: "u",
        nodeVersion: "22.12.0",
      }),
    ).rejects.toBeInstanceOf(ComposioError);
  });

  it("fails when link returns no redirect", async () => {
    const client: LoadedComposioClient = {
      connectedAccounts: {
        link: async () => ({}),
      },
      tools: { execute: async () => ({}) },
    };
    await expect(
      createComposioConnectLink({
        apiKey: "k",
        userId: "u",
        client,
        nodeVersion: "22.22.3",
      }),
    ).rejects.toMatchObject({ code: "composio.link_failed" });
  });
});

describe("gmail helpers", () => {
  it("gmailSend maps to GMAIL_SEND_EMAIL", async () => {
    const out = await gmailSend({
      to: "a@b.test",
      subject: "s",
      body: "hello",
      userId: "u",
      connectedAccountId: "ca",
      executeTool: async (args) => {
        expect(args.toolSlug).toBe(GMAIL_SEND_TOOL);
        return { providerId: "m1" };
      },
    });
    expect(out.providerId).toBe("m1");
  });

  it("gmailReadRecent normalizes message list", async () => {
    const { messages } = await gmailReadRecent({
      userId: "u",
      connectedAccountId: "ca",
      maxResults: 3,
      executeTool: async (args) => {
        expect(args.toolSlug).toBe(GMAIL_FETCH_TOOL);
        expect(args.arguments.max_results).toBe(3);
        return {
          providerId: "fetch",
          raw: {
            data: {
              messages: [
                { id: "1", subject: "Hi", from: "x@y.test", threadId: "t1" },
              ],
            },
          },
        };
      },
    });
    expect(messages).toEqual([
      { id: "1", subject: "Hi", from: "x@y.test", snippet: undefined, threadId: "t1" },
    ]);
  });

  it("gmailReply maps to GMAIL_REPLY_TO_THREAD", async () => {
    const out = await gmailReply({
      threadId: "t1",
      body: "Thanks.",
      userId: "u",
      connectedAccountId: "ca",
      executeTool: async (args) => {
        expect(args.toolSlug).toBe(GMAIL_REPLY_TOOL);
        expect(args.arguments.thread_id).toBe("t1");
        return { providerId: "r1" };
      },
    });
    expect(out.providerId).toBe("r1");
  });
});
