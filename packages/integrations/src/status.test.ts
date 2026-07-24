import { describe, expect, it } from "vitest";
import { integrationStatus } from "./status";

describe("integrationStatus", () => {
  it("reports not_configured honestly when keys are missing", () => {
    const statuses = integrationStatus({});
    expect(statuses.find((s) => s.provider === "zendesk")?.state).toBe("not_configured");
    expect(statuses.find((s) => s.provider === "github")?.state).toBe("not_configured");
    expect(statuses.find((s) => s.provider === "email")?.state).toBe("not_configured");
    expect(statuses.find((s) => s.provider === "composio")?.state).toBe("not_configured");
    expect(statuses.every((s) => !JSON.stringify(s).includes("sk-"))).toBe(true);
    expect(statuses.find((s) => s.provider === "github")?.detail).toMatch(/FakeGitHub/i);
    expect(statuses.find((s) => s.provider === "email")?.detail).toMatch(/FakeNotifier/i);
  });

  it("marks octen connected when key present", () => {
    const statuses = integrationStatus({ OCTEN_API_KEY: "present-but-not-logged" });
    expect(statuses.find((s) => s.provider === "octen")?.state).toBe("connected");
  });

  it("does not greenwash Composio when API key present but Gmail unlinked", () => {
    const statuses = integrationStatus({
      COMPOSIO_API_KEY: "present",
      COMPOSIO_USER_ID: "user-1",
      // no COMPOSIO_GMAIL_ACCOUNT_ID
      nodeVersion: "22.22.3",
    });
    expect(statuses.find((s) => s.provider === "composio")?.state).toBe("degraded");
    expect(statuses.find((s) => s.provider === "email")?.state).toBe("not_configured");
  });

  it("does not mark Composio connected below Node floor even with full keys", () => {
    const statuses = integrationStatus({
      COMPOSIO_API_KEY: "present",
      COMPOSIO_USER_ID: "user-1",
      COMPOSIO_GMAIL_ACCOUNT_ID: "acct-1",
      nodeVersion: "22.12.0",
    });
    expect(statuses.find((s) => s.provider === "composio")?.state).toBe("degraded");
    expect(statuses.find((s) => s.provider === "email")?.state).toBe("not_configured");
  });

  it("surfaces worker unreachable as degraded never silent success", () => {
    const statuses = integrationStatus({
      OCTEN_API_KEY: "present",
      GITHUB_TOKEN: "present",
      workerReachable: false,
    });
    expect(statuses.find((s) => s.provider === "octen")?.state).toBe("degraded");
    expect(statuses.find((s) => s.provider === "github")?.state).toBe("degraded");
    expect(statuses.find((s) => s.provider === "github")?.detail).toMatch(/worker unreachable/i);
  });
});
