import { describe, expect, it } from "vitest";
import { getFlags } from "./flags";
import { redact } from "./logging";

describe("configuration", () => {
  it("defaults every provider adapter to a deterministic fake", () => {
    const flags = getFlags({});
    expect(flags.adapters.openai).toBe("fake");
    expect(flags.adapters.codex).toBe("fake");
    expect(flags.adapters.octen).toBe("fake");
    expect(flags.adapters.composio).toBe("fake");
    expect(flags.adapters.zendesk).toBe("fake");
  });

  it("redacts both secret keys and secret-shaped values", () => {
    expect(
      redact({
        apiKey: "top-secret",
        nested: { message: "Bearer abc.def.ghi", harmless: "visible" },
      }),
    ).toEqual({
      apiKey: "[REDACTED]",
      nested: { message: "[REDACTED]", harmless: "visible" },
    });
  });
});
