import { describe, expect, it } from "vitest";
import { integrationStatus } from "./status";

describe("integrationStatus", () => {
  it("reports not_configured honestly when keys are missing", () => {
    const statuses = integrationStatus({});
    expect(statuses.find((s) => s.provider === "zendesk")?.state).toBe("not_configured");
    expect(statuses.find((s) => s.provider === "github")?.state).toBe("not_configured");
    expect(statuses.every((s) => !JSON.stringify(s).includes("sk-"))).toBe(true);
  });

  it("marks octen connected when key present", () => {
    const statuses = integrationStatus({ OCTEN_API_KEY: "present-but-not-logged" });
    expect(statuses.find((s) => s.provider === "octen")?.state).toBe("connected");
  });
});
