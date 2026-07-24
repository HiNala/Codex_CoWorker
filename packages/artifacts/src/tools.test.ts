import { describe, expect, it } from "vitest";
import type { Session } from "@forge/contracts";
import { ArtifactService } from "./service/artifact-service";
import {
  ARTIFACT_TOOL_NAMES,
  artifactToolDescriptors,
} from "./tools/descriptors";
import { dispatchArtifactTool, isArtifactToolName } from "./tools/handlers";

const ORG = "0198206f-5f53-7000-8000-0000000000a1";
const OTHER_ORG = "0198206f-5f53-7000-8000-0000000000a2";
const ASSIGNMENT = "0198206f-5f53-7000-8000-0000000000b1";
const RUN = "0198206f-5f53-7000-8000-0000000000c1";
const COWORKER = "0198206f-5f53-7000-8000-0000000000d1";

const session: Session = {
  userId: "0198206f-5f53-7000-8000-0000000000e1",
  orgId: ORG,
  email: "owner@acme.test",
  role: "owner",
  displayName: "Owner",
};

describe("artifact tools", () => {
  it("exposes exactly seven controlled tools with the required names", () => {
    expect(ARTIFACT_TOOL_NAMES).toHaveLength(7);
    expect(artifactToolDescriptors).toHaveLength(7);
    expect(artifactToolDescriptors.map((d) => d.name)).toEqual([
      "artifact.create",
      "artifact.update",
      "artifact.read",
      "artifact.list",
      "artifact.attach_evidence",
      "artifact.request_review",
      "artifact.compare_versions",
    ]);
    for (const name of ARTIFACT_TOOL_NAMES) {
      expect(isArtifactToolName(name)).toBe(true);
    }
  });

  it("each descriptor has name, description, and inputSchema", () => {
    for (const d of artifactToolDescriptors) {
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.description.length).toBeGreaterThan(0);
      expect(d.inputSchema).toBeTypeOf("object");
    }
  });

  it("handlers dispatch create → update → read → list → evidence → review → compare", () => {
    const service = new ArtifactService();

    const created = dispatchArtifactTool(service, session, "artifact.create", {
      assignmentId: ASSIGNMENT,
      runId: RUN,
      coworkerId: COWORKER,
      type: "document.markdown",
      title: "Incident Report",
    }) as { id: string; status: string };

    expect(created.status).toBe("declared");

    const updated = dispatchArtifactTool(service, session, "artifact.update", {
      artifactId: created.id,
      baseVersionId: null,
      content: "# Incident\n\nSomething broke.\n",
      changeSummary: "initial draft",
      authorType: "agent",
      authorRef: "run:1",
    }) as { artifact: { id: string; status: string }; version: { id: string } };

    expect(updated.artifact.status).toBe("drafting");
    const v1 = updated.version.id;

    const v2result = dispatchArtifactTool(service, session, "artifact.update", {
      artifactId: created.id,
      baseVersionId: v1,
      content: "# Incident\n\nSomething broke.\n\nRoot cause found.\n",
      changeSummary: "add root cause",
      authorType: "agent",
      authorRef: "run:1",
    }) as { version: { id: string } };
    const v2 = v2result.version.id;

    const read = dispatchArtifactTool(service, session, "artifact.read", {
      artifactId: created.id,
    }) as { content: string | null };
    expect(read.content).toContain("Root cause");

    const listed = dispatchArtifactTool(service, session, "artifact.list", {
      assignmentId: ASSIGNMENT,
      type: "document.markdown",
    }) as unknown[];
    expect(listed).toHaveLength(1);

    const evidence = dispatchArtifactTool(service, session, "artifact.attach_evidence", {
      artifactId: created.id,
      anchor: "sec:root-cause",
      evidenceIds: ["0198206f-5f53-7000-8000-0000000000f1"],
    }) as { evidenceIds: string[] };
    expect(evidence.evidenceIds).toEqual(["0198206f-5f53-7000-8000-0000000000f1"]);

    const ready = dispatchArtifactTool(service, session, "artifact.request_review", {
      artifactId: created.id,
    }) as { status: string };
    expect(ready.status).toBe("ready_for_review");

    const compare = dispatchArtifactTool(service, session, "artifact.compare_versions", {
      artifactId: created.id,
      versionAId: v1,
      versionBId: v2,
    }) as { summary: { changed: boolean; addedLines: number } };
    expect(compare.summary.changed).toBe(true);
    expect(compare.summary.addedLines).toBeGreaterThan(0);
  });

  it("handler list returns empty for foreign orgId filter", () => {
    const service = new ArtifactService();
    dispatchArtifactTool(service, session, "artifact.create", {
      assignmentId: ASSIGNMENT,
      runId: RUN,
      coworkerId: COWORKER,
      type: "document.markdown",
      title: "Private",
    });

    const listed = dispatchArtifactTool(service, session, "artifact.list", {
      orgId: OTHER_ORG,
    }) as unknown[];
    expect(listed).toEqual([]);
  });
});
