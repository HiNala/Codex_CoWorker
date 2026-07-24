import { describe, expect, it } from "vitest";
import { artifactRenderers, resolveRenderer } from "./registry";
import { buildFallbackModel } from "./fallback";

describe("resolveRenderer", () => {
  it("maps known types", () => {
    expect(resolveRenderer("document.markdown")).toBe("markdown");
    expect(resolveRenderer("table.typed")).toBe("typed-table");
    expect(resolveRenderer("code.change")).toBe("code-change");
    expect(resolveRenderer("capability.package")).toBe("capability-package");
    expect(resolveRenderer("receipt.assignment")).toBe("receipt");
  });

  it("returns fallback for unknown types", () => {
    expect(resolveRenderer("future.widget")).toBe("fallback");
    expect(resolveRenderer("")).toBe("fallback");
    expect(resolveRenderer("document.markdown.v2")).toBe("fallback");
  });

  it("exposes anchors for E, B, and J types", () => {
    expect(artifactRenderers["document.markdown"]).toBe("markdown");
    expect(artifactRenderers["capability.package"]).toBe("capability-package");
    expect(artifactRenderers["receipt.assignment"]).toBe("receipt");
  });
});

describe("fallback", () => {
  it("builds a safe metadata model without crashing", () => {
    const model = buildFallbackModel({
      type: "future.widget",
      title: "Mystery",
      status: "ready_for_review",
      sha256: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    });
    expect(model.notice).toMatch(/no specialized renderer/i);
    expect(model.canDownload).toBe(false);
    expect(model.sha256Truncated).toContain("…");
  });
});
