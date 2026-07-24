import { describe, expect, it } from "vitest";
import { dockTypeIcon, dockTypeLabel, normalizeArtifactType } from "./dock-type";

describe("dock type presentation", () => {
  it("never returns ?? for known or unknown types", () => {
    expect(dockTypeIcon("document.markdown")).toBe("MD");
    expect(dockTypeIcon("table.typed")).toBe("TB");
    expect(dockTypeIcon("code.change")).toBe("DF");
    expect(dockTypeIcon("code.diff")).toBe("DF");
    expect(dockTypeIcon("weird.unknown")).toBe("OT");
    expect(dockTypeIcon("weird.unknown")).not.toBe("??");
  });

  it("labels code.diff as Code", () => {
    expect(normalizeArtifactType("code.diff")).toBe("code.change");
    expect(dockTypeLabel("code.diff")).toBe("Code");
    expect(dockTypeLabel("nope")).toBe("Other");
  });
});
