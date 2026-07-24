import { describe, expect, it } from "vitest";
import { contractSystemPrompt } from "./contract";

describe("contractSystemPrompt", () => {
  it("lists installed capabilities and asks for conservative ceilings", () => {
    const prompt = contractSystemPrompt({
      coworkerName: "Nala",
      charter: "Own checkout reliability.",
      projectName: "Acme Store",
      installed: [
        {
          slug: "ticket-clusterer",
          purpose: "Cluster support tickets",
          inputShape: "ticket[]",
          outputShape: "cluster[]",
        },
      ],
    });

    expect(prompt).toContain("You are Nala");
    expect(prompt).toContain("Own checkout reliability.");
    expect(prompt).toContain("Project context: Acme Store");
    expect(prompt).toContain("ticket-clusterer");
    expect(prompt).toContain("Prefer reusing installed capabilities");
    expect(prompt).toContain("recommendedCeilingMicrocredits");
    expect(prompt).toContain("clarifying questions only when ambiguity");
  });

  it("handles empty capability catalog", () => {
    const prompt = contractSystemPrompt({
      coworkerName: "Nala",
      charter: "Ship.",
      installed: [],
    });
    expect(prompt).toContain("No capabilities are installed yet.");
  });
});
