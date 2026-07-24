import { describe, expect, it } from "vitest";
import type { Session } from "@forge/contracts";
import {
  ArtifactIllegalTransitionError,
  ArtifactNoContentError,
  ArtifactNotFoundError,
  ArtifactSecretDetectedError,
  ArtifactStaleBaseError,
  ArtifactValidationError,
} from "./errors";
import { contentByteLength, sha256Hex } from "./hash";
import { ArtifactService } from "./service/artifact-service";

const ORG_A = "0198206f-5f53-7000-8000-0000000000a1";
const ORG_B = "0198206f-5f53-7000-8000-0000000000b1";
const ASSIGNMENT = "0198206f-5f53-7000-8000-0000000000c1";
const RUN = "0198206f-5f53-7000-8000-0000000000d1";
const COWORKER = "0198206f-5f53-7000-8000-0000000000e1";
const USER_A = "0198206f-5f53-7000-8000-0000000000f1";
const USER_B = "0198206f-5f53-7000-8000-0000000000f2";

const sessionA: Session = {
  userId: USER_A,
  orgId: ORG_A,
  email: "a@acme.test",
  role: "owner",
  displayName: "A",
};

const sessionB: Session = {
  userId: USER_B,
  orgId: ORG_B,
  email: "b@other.test",
  role: "member",
  displayName: "B",
};

function declareDoc(service: ArtifactService, session: Session = sessionA) {
  return service.create(session, {
    assignmentId: ASSIGNMENT,
    runId: RUN,
    coworkerId: COWORKER,
    type: "document.markdown",
    title: "Incident Report",
  });
}

describe("ArtifactService", () => {
  describe("create", () => {
    it("declares artifacts in declared status with null currentVersionId", () => {
      const service = new ArtifactService();
      const artifact = declareDoc(service);
      expect(artifact.status).toBe("declared");
      expect(artifact.currentVersionId).toBeNull();
      expect(artifact.orgId).toBe(ORG_A);
      expect(artifact.slug).toBe("incident-report");
    });
  });

  describe("version immutability", () => {
    it("update creates a new version and leaves old content unchanged", () => {
      const service = new ArtifactService();
      const artifact = declareDoc(service);

      const v1 = service.update(sessionA, {
        artifactId: artifact.id,
        baseVersionId: null,
        content: "version one body",
        changeSummary: "v1",
        authorType: "agent",
        authorRef: "agent-1",
      });

      expect(v1.version.ordinal).toBe(1);
      expect(v1.version.parentVersionId).toBeNull();
      expect(v1.artifact.status).toBe("drafting");
      expect(v1.artifact.currentVersionId).toBe(v1.version.id);

      const oldInline = v1.version.contentInline;
      expect(oldInline).toBe("version one body");

      const v2 = service.update(sessionA, {
        artifactId: artifact.id,
        baseVersionId: v1.version.id,
        content: "version two body",
        changeSummary: "v2",
        authorType: "human",
        authorRef: USER_A,
      });

      expect(v2.version.ordinal).toBe(2);
      expect(v2.version.parentVersionId).toBe(v1.version.id);
      expect(v2.version.contentInline).toBe("version two body");

      // Old version record is unchanged (immutable / append-only).
      const storedV1 = service.store.getVersion(v1.version.id);
      expect(storedV1).toBeDefined();
      expect(storedV1?.contentInline).toBe("version one body");
      expect(storedV1?.contentInline).toBe(oldInline);
      expect(storedV1?.sha256).toBe(sha256Hex("version one body"));
      expect(storedV1?.ordinal).toBe(1);

      // Mutating the returned clone must not affect the store.
      v1.version.contentInline = "tampered";
      expect(service.store.getVersion(v1.version.id)?.contentInline).toBe("version one body");
    });

    it("ordinals are append-only 1,2,3...", () => {
      const service = new ArtifactService();
      const artifact = declareDoc(service);
      let base: string | null = null;
      for (let i = 1; i <= 3; i++) {
        const result = service.update(sessionA, {
          artifactId: artifact.id,
          baseVersionId: base,
          content: `body-${i}`,
          changeSummary: `v${i}`,
          authorType: "agent",
          authorRef: "agent-1",
        });
        expect(result.version.ordinal).toBe(i);
        base = result.version.id;
      }
      expect(service.store.listVersions(artifact.id).map((v) => v.ordinal)).toEqual([1, 2, 3]);
    });
  });

  describe("stale base", () => {
    it("rejects update when baseVersionId does not match currentVersionId", () => {
      const service = new ArtifactService();
      const artifact = declareDoc(service);

      const v1 = service.update(sessionA, {
        artifactId: artifact.id,
        baseVersionId: null,
        content: "first",
        changeSummary: "v1",
        authorType: "agent",
        authorRef: "agent-1",
      });

      // Human edit wins the current tip.
      const v2 = service.update(sessionA, {
        artifactId: artifact.id,
        baseVersionId: v1.version.id,
        content: "human edit",
        changeSummary: "human",
        authorType: "human",
        authorRef: USER_A,
      });
      expect(v2.version.ordinal).toBe(2);

      // Agent still holding v1 as base → 409 stale.
      expect(() =>
        service.update(sessionA, {
          artifactId: artifact.id,
          baseVersionId: v1.version.id,
          content: "agent overwrite attempt",
          changeSummary: "stale",
          authorType: "agent",
          authorRef: "agent-1",
        }),
      ).toThrow(ArtifactStaleBaseError);

      try {
        service.update(sessionA, {
          artifactId: artifact.id,
          baseVersionId: v1.version.id,
          content: "agent overwrite attempt",
          changeSummary: "stale",
          authorType: "agent",
          authorRef: "agent-1",
        });
      } catch (err) {
        expect(err).toBeInstanceOf(ArtifactStaleBaseError);
        expect((err as ArtifactStaleBaseError).code).toBe("artifact.stale_base_version");
        expect((err as ArtifactStaleBaseError).status).toBe(409);
      }

      // Tip content remains the human edit.
      const read = service.read(sessionA, artifact.id);
      expect(read?.content).toBe("human edit");
      expect(service.store.listVersions(artifact.id)).toHaveLength(2);
    });
  });

  describe("SHA-256 and inline vs object key", () => {
    it("always stores sha256 of content", () => {
      const service = new ArtifactService();
      const artifact = declareDoc(service);
      const content = "hash me please";
      const result = service.update(sessionA, {
        artifactId: artifact.id,
        baseVersionId: null,
        content,
        changeSummary: "hash",
        authorType: "agent",
        authorRef: "agent-1",
      });
      expect(result.version.sha256).toBe(sha256Hex(content));
      expect(result.version.sha256).toMatch(/^[a-f0-9]{64}$/);
    });

    it("stores content under 64KB inline", () => {
      const service = new ArtifactService();
      const artifact = declareDoc(service);
      const content = "x".repeat(1024);
      expect(contentByteLength(content)).toBeLessThan(64 * 1024);

      const result = service.update(sessionA, {
        artifactId: artifact.id,
        baseVersionId: null,
        content,
        changeSummary: "small",
        authorType: "agent",
        authorRef: "agent-1",
      });

      expect(result.version.contentInline).toBe(content);
      expect(result.version.objectKey).toBeNull();
    });

    it("uses objectKey at the 64KB boundary and above", () => {
      const service = new ArtifactService();
      const artifact = declareDoc(service);
      const content = "y".repeat(64 * 1024);
      expect(contentByteLength(content)).toBe(64 * 1024);

      const result = service.update(sessionA, {
        artifactId: artifact.id,
        baseVersionId: null,
        content,
        changeSummary: "large",
        authorType: "agent",
        authorRef: "agent-1",
      });

      expect(result.version.contentInline).toBeNull();
      expect(result.version.objectKey).toBe(
        `artifacts/${ORG_A}/${artifact.id}/${result.version.id}`,
      );
      expect(result.version.sha256).toBe(sha256Hex(content));

      const read = service.read(sessionA, artifact.id);
      expect(read?.content).toBe(content);
      expect(read?.content?.length).toBe(64 * 1024);
    });
  });

  describe("secret scan", () => {
    it.each([
      ["sk- token", "key is sk-abcdefghijklmnopqrstuvwxyz"],
      ["OPENAI_API_KEY=", "config OPENAI_API_KEY=sk-leaked"],
      ["AKIA", "aws key AKIAIOSFODNN7EXAMPLE appears"],
    ])("blocks content containing %s", (_label, content) => {
      const service = new ArtifactService();
      const artifact = declareDoc(service);
      expect(() =>
        service.update(sessionA, {
          artifactId: artifact.id,
          baseVersionId: null,
          content,
          changeSummary: "bad",
          authorType: "agent",
          authorRef: "agent-1",
        }),
      ).toThrow(ArtifactSecretDetectedError);

      try {
        service.update(sessionA, {
          artifactId: artifact.id,
          baseVersionId: null,
          content,
          changeSummary: "bad",
          authorType: "agent",
          authorRef: "agent-1",
        });
      } catch (err) {
        expect((err as ArtifactSecretDetectedError).code).toBe("artifact.secret_detected");
        expect((err as ArtifactSecretDetectedError).status).toBe(400);
      }

      expect(service.store.listVersions(artifact.id)).toHaveLength(0);
    });
  });

  describe("cross-tenant denial", () => {
    it("read returns null for foreign org (404 semantics, no leak)", () => {
      const service = new ArtifactService();
      const artifact = declareDoc(service);
      service.update(sessionA, {
        artifactId: artifact.id,
        baseVersionId: null,
        content: "secret to org A",
        changeSummary: "v1",
        authorType: "agent",
        authorRef: "agent-1",
      });

      expect(service.read(sessionB, artifact.id)).toBeNull();
    });

    it("list never returns foreign-org artifacts", () => {
      const service = new ArtifactService();
      declareDoc(service);
      expect(service.list(sessionB, {})).toEqual([]);
      expect(service.list(sessionA, { orgId: ORG_B })).toEqual([]);
    });

    it("update/attach/review/compare throw not_found for foreign org", () => {
      const service = new ArtifactService();
      const artifact = declareDoc(service);
      const v1 = service.update(sessionA, {
        artifactId: artifact.id,
        baseVersionId: null,
        content: "body",
        changeSummary: "v1",
        authorType: "agent",
        authorRef: "agent-1",
      });

      expect(() =>
        service.update(sessionB, {
          artifactId: artifact.id,
          baseVersionId: v1.version.id,
          content: "hack",
          changeSummary: "nope",
          authorType: "agent",
          authorRef: "evil",
        }),
      ).toThrow(ArtifactNotFoundError);

      expect(() =>
        service.attachEvidence(sessionB, {
          artifactId: artifact.id,
          anchor: "x",
          evidenceIds: ["0198206f-5f53-7000-8000-000000000099"],
        }),
      ).toThrow(ArtifactNotFoundError);

      expect(() => service.requestReview(sessionB, artifact.id)).toThrow(ArtifactNotFoundError);

      expect(() =>
        service.compareVersions(sessionB, artifact.id, v1.version.id, v1.version.id),
      ).toThrow(ArtifactNotFoundError);

      try {
        service.update(sessionB, {
          artifactId: artifact.id,
          baseVersionId: null,
          content: "x",
          changeSummary: "x",
          authorType: "agent",
          authorRef: "x",
        });
      } catch (err) {
        expect((err as ArtifactNotFoundError).code).toBe("artifact.not_found");
        expect((err as ArtifactNotFoundError).status).toBe(404);
      }
    });
  });

  describe("lifecycle via service", () => {
    it("request_review transitions drafting → ready_for_review when content exists", () => {
      const service = new ArtifactService();
      const artifact = declareDoc(service);

      expect(() => service.requestReview(sessionA, artifact.id)).toThrow(ArtifactNoContentError);

      service.update(sessionA, {
        artifactId: artifact.id,
        baseVersionId: null,
        content: "ready content",
        changeSummary: "v1",
        authorType: "agent",
        authorRef: "agent-1",
      });

      const ready = service.requestReview(sessionA, artifact.id);
      expect(ready.status).toBe("ready_for_review");

      expect(() => service.requestReview(sessionA, artifact.id)).toThrow(
        ArtifactIllegalTransitionError,
      );
    });

    it("supports approve → delivered path", () => {
      const service = new ArtifactService();
      const artifact = declareDoc(service);
      service.update(sessionA, {
        artifactId: artifact.id,
        baseVersionId: null,
        content: "body",
        changeSummary: "v1",
        authorType: "agent",
        authorRef: "agent-1",
      });
      service.requestReview(sessionA, artifact.id);
      const approved = service.transition(sessionA, artifact.id, "approved");
      expect(approved.status).toBe("approved");
      expect(approved.approvedVersionId).toBe(approved.currentVersionId);
      const delivered = service.transition(sessionA, artifact.id, "delivered");
      expect(delivered.status).toBe("delivered");
    });
  });

  describe("type content validation", () => {
    it("accepts table.typed JSON with columns and rows", () => {
      const service = new ArtifactService();
      const artifact = service.create(sessionA, {
        assignmentId: ASSIGNMENT,
        runId: RUN,
        coworkerId: COWORKER,
        type: "table.typed",
        title: "Customers",
      });
      const content = JSON.stringify({
        columns: [{ id: "name", type: "string" }],
        rows: [{ id: "r1", name: "Acme" }],
      });
      const result = service.update(sessionA, {
        artifactId: artifact.id,
        baseVersionId: null,
        content,
        changeSummary: "seed",
        authorType: "agent",
        authorRef: "agent-1",
      });
      expect(result.version.contentFormat).toBe("json");
    });

    it("rejects table.typed without columns/rows", () => {
      const service = new ArtifactService();
      const artifact = service.create(sessionA, {
        assignmentId: ASSIGNMENT,
        runId: RUN,
        coworkerId: COWORKER,
        type: "table.typed",
        title: "Bad Table",
      });
      expect(() =>
        service.update(sessionA, {
          artifactId: artifact.id,
          baseVersionId: null,
          content: JSON.stringify({ foo: 1 }),
          changeSummary: "bad",
          authorType: "agent",
          authorRef: "agent-1",
        }),
      ).toThrow(ArtifactValidationError);
    });
  });

  describe("compare_versions", () => {
    it("returns both versions and a text diff summary", () => {
      const service = new ArtifactService();
      const artifact = declareDoc(service);
      const v1 = service.update(sessionA, {
        artifactId: artifact.id,
        baseVersionId: null,
        content: "line a\nline b\n",
        changeSummary: "v1",
        authorType: "agent",
        authorRef: "agent-1",
      });
      const v2 = service.update(sessionA, {
        artifactId: artifact.id,
        baseVersionId: v1.version.id,
        content: "line a\nline c\n",
        changeSummary: "v2",
        authorType: "agent",
        authorRef: "agent-1",
      });

      const compare = service.compareVersions(sessionA, artifact.id, v1.version.id, v2.version.id);

      expect(compare.versionA.id).toBe(v1.version.id);
      expect(compare.versionB.id).toBe(v2.version.id);
      expect(compare.contentA).toBe("line a\nline b\n");
      expect(compare.contentB).toBe("line a\nline c\n");
      expect(compare.summary.contentEqual).toBe(false);
      expect(compare.summary.changed).toBe(true);
      expect(compare.summary.addedLines).toBeGreaterThan(0);
      expect(compare.summary.removedLines).toBeGreaterThan(0);

      const same = service.compareVersions(sessionA, artifact.id, v1.version.id, v1.version.id);
      expect(same.summary.contentEqual).toBe(true);
      expect(same.summary.changed).toBe(false);
    });
  });

  describe("attach_evidence", () => {
    it("merges evidence ids on an anchor", () => {
      const service = new ArtifactService();
      const artifact = declareDoc(service);
      const e1 = "0198206f-5f53-7000-8000-000000000011";
      const e2 = "0198206f-5f53-7000-8000-000000000012";

      service.attachEvidence(sessionA, {
        artifactId: artifact.id,
        anchor: "cell:r1.c1",
        evidenceIds: [e1],
      });
      const second = service.attachEvidence(sessionA, {
        artifactId: artifact.id,
        anchor: "cell:r1.c1",
        evidenceIds: [e1, e2],
      });
      expect(second.evidenceIds).toEqual([e1, e2]);

      const read = service.read(sessionA, artifact.id);
      expect(read?.evidenceByAnchor["cell:r1.c1"]).toEqual([e1, e2]);
    });
  });
});
