/**
 * Research golden-path: missing OCTEN_API_KEY degrades to FakeResearchGateway.
 */
import { describe, expect, it } from "vitest";
import { createResearchGateway, FakeResearchGateway } from "./index";

describe("research golden path (no live Octen)", () => {
  it("uses FakeResearchGateway when OCTEN_API_KEY is unset", async () => {
    const fake = new FakeResearchGateway();
    const { gateway, state } = createResearchGateway({ OCTEN_API_KEY: undefined }, fake);
    expect(state).toBe("not_configured");
    expect(gateway).toBe(fake);

    const evidence = await gateway.search({ query: "stripe checkout session price" });
    expect(evidence.length).toBeGreaterThan(0);
    for (const row of evidence) {
      expect(row.contentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(row.retrievedAt).toBeTruthy();
      // Never ship secrets in evidence excerpts.
      expect(JSON.stringify(row)).not.toMatch(/OCTEN_API_KEY|sk-/);
    }
  });
});
