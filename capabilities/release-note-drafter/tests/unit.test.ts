import { describe, expect, it } from "vitest";
import {
  CapabilityInputError,
  createRestrictedContext,
} from "@forge/capability-sdk";
import capability from "../src/index";
import type { ReleaseNoteInput } from "../src/lib/types";

function sample(audience: "internal" | "customer" = "internal"): ReleaseNoteInput {
  return {
    previousTag: "v1.0.0",
    newTag: "v1.1.0",
    audience,
    commits: [
      {
        sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        message: "feat(api): add webhook retry (#12)",
        author: "dev",
        files: ["src/webhooks.ts"],
      },
      {
        sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        message: "fix: handle null customer_ref",
        author: "dev",
        files: ["src/hooks.ts"],
      },
      {
        sha: "cccccccccccccccccccccccccccccccccccccccc",
        message: "refactor: extract parser helpers",
        author: "dev",
        files: ["src/lib/parse.ts"],
      },
      {
        sha: "dddddddddddddddddddddddddddddddddddddddd",
        message:
          "feat(api)!: rename customer_ref to customer_id\n\nBREAKING CHANGE: metadata field renamed",
        author: "dev",
        files: ["src/api.ts"],
      },
      {
        sha: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        message: "Add logging for timeouts",
        author: "dev",
        files: ["src/log.ts"],
      },
    ],
  };
}

async function run(input: unknown) {
  return capability.execute(input as never, createRestrictedContext());
}

describe("release-note-drafter", () => {
  it("manifest version 1.0.0", () => {
    expect(capability.manifest.version).toBe("1.0.0");
    expect(capability.manifest.authoredBy).toBe("codex");
  });

  it("groups conventional commits for internal audience", async () => {
    const out = await run(sample("internal"));
    expect(out.breakingChangeCount).toBe(1);
    expect(out.grouped.breaking.length).toBe(1);
    expect(out.grouped.features.length).toBeGreaterThanOrEqual(1);
    expect(out.grouped.fixes.length).toBeGreaterThanOrEqual(1);
    expect(out.grouped.internal.length).toBeGreaterThanOrEqual(1);
    expect(out.markdown).toContain("v1.1.0");
    expect(out.markdown).toContain("Breaking changes");
  });

  it("customer audience strips internal", async () => {
    const out = await run(sample("customer"));
    expect(out.grouped.internal).toEqual([]);
    expect(out.markdown).not.toContain("## Internal");
    // customer sentences
    for (const line of out.grouped.features) {
      expect(line.endsWith(".") || line.endsWith("!")).toBe(true);
    }
  });

  it("empty commits still works", async () => {
    const out = await run({
      commits: [],
      previousTag: "v0.1.0",
      newTag: "v0.2.0",
      audience: "customer",
    });
    expect(out.breakingChangeCount).toBe(0);
    expect(out.grouped).toEqual({
      breaking: [],
      features: [],
      fixes: [],
      internal: [],
    });
    expect(out.markdown).toContain("No user-facing changes");
  });

  it("is deterministic", async () => {
    const input = sample("internal");
    const a = await run(input);
    const b = await run(input);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("rejects bad audience", async () => {
    await expect(
      run({ ...sample(), audience: "public" }),
    ).rejects.toBeInstanceOf(CapabilityInputError);
  });
});
