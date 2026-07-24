/**
 * Golden-path half owned by Rigel (Tracks E+C):
 * naive(4) → trusted expects 9 → repair(9) → typed-table artifact with
 * version/evidence/provenance lineage → renderer consumes output.
 *
 * Does not touch foundry/verifier (Cael). Uses real ndjson + dual-rule fixture.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { EvidenceRecord, Session } from "@forge/contracts";
import {
  ATTEMPT_1_FAILURE_MESSAGE,
  DEMO_SEED_EXPECTED,
  DEMO_WINDOW,
  loadCheckoutErrorNdjsonLines,
  naiveAnalyzeCheckoutErrors,
  referenceAnalyzeCheckoutErrors,
} from "@forge/capability-fixtures";
import { resolveRowEvidence } from "../evidence/resolve";
import { buildProvenanceGraph } from "../provenance/graph";
import {
  exportCsv,
  resolveRenderer,
  tableMetrics,
  type TypedTableContent,
} from "../renderers/index";
import { ArtifactService } from "../service/artifact-service";
import { sha256Hex } from "../hash";

const ORG = "0198206f-5f53-7000-8000-0000000000a1";
const ASSIGNMENT = "0198206f-5f53-7000-8000-0000000000c1";
const RUN = "0198206f-5f53-7000-8000-0000000000d1";
const COWORKER = "0198206f-5f53-7000-8000-0000000000e1";
const USER = "0198206f-5f53-7000-8000-0000000000f1";

const session: Session = {
  userId: USER,
  orgId: ORG,
  email: "nala@acme.test",
  role: "owner",
  displayName: "Nala",
};

function evidenceId(seed: string): string {
  // Deterministic UUIDv4-shaped id from seed for tests (not crypto-strong).
  const h = createHash("sha256").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function loadCaelContract(): {
  attempt1: { distinctCount: number; failureMessage: string; affectedCustomers: string[] };
  attempt2: { distinctCount: number; expectedOutput: typeof DEMO_SEED_EXPECTED };
} {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
  const path = join(
    root,
    "packages/capability-fixtures/checkout-error-log-analyzer/cael-contract.json",
  );
  return JSON.parse(readFileSync(path, "utf8")) as ReturnType<typeof loadCaelContract>;
}

describe("Broken Checkout golden path — Rigel half", () => {
  const lines = loadCheckoutErrorNdjsonLines();
  const input = { lines, window: { ...DEMO_WINDOW } };
  const contract = loadCaelContract();

  it("attempt 1: naive deterministically reports 4; trusted expects 9", () => {
    const naive = naiveAnalyzeCheckoutErrors(input);
    expect(naive.distinctCount).toBe(4);
    expect(naive.distinctCount).toBe(contract.attempt1.distinctCount);
    expect(naive.affectedCustomers).toEqual(contract.attempt1.affectedCustomers);
    expect(naive.affectedCustomers).not.toContain("cus_ZZ9");

    expect(DEMO_SEED_EXPECTED.distinctCount).toBe(9);
    expect(contract.attempt2.distinctCount).toBe(9);

    const message = `expected ${DEMO_SEED_EXPECTED.distinctCount}, received ${naive.distinctCount}`;
    expect(message).toBe(ATTEMPT_1_FAILURE_MESSAGE);
    expect(message).toBe(contract.attempt1.failureMessage);
    expect(message).toBe("expected 9, received 4");
  });

  it("attempt 2: repaired (reference) reports 9 matching trusted fixture", () => {
    const repaired = referenceAnalyzeCheckoutErrors(input);
    expect(repaired.distinctCount).toBe(9);
    expect(repaired).toEqual(DEMO_SEED_EXPECTED);
    expect(repaired).toEqual(contract.attempt2.expectedOutput);
    expect(repaired.affectedCustomers).not.toContain("cus_ZZ9");
  });

  it("artifact version + evidence + provenance lineage is valid; renderer consumes table", () => {
    const repaired = referenceAnalyzeCheckoutErrors(input);
    const service = new ArtifactService();

    // 1) Declare affected-customers typed table (demo artifact #2)
    const artifact = service.create(session, {
      assignmentId: ASSIGNMENT,
      runId: RUN,
      coworkerId: COWORKER,
      type: "table.typed",
      title: "Affected customers — annual checkout",
      slug: "affected-customers-annual-checkout",
    });
    expect(artifact.status).toBe("declared");
    expect(artifact.currentVersionId).toBeNull();

    // 2) Evidence records — one per affected customer (ticket/log lineage stand-in)
    const evidenceRecords: EvidenceRecord[] = repaired.affectedCustomers.map((cus) => {
      const excerpt = `checkout_failed for ${cus} within demo window`;
      return {
        id: evidenceId(`ev-${cus}`),
        orgId: ORG,
        kind: "ticket" as const,
        sourceUrl: null,
        title: `Log cluster ${cus}`,
        excerpt,
        contentSha256: sha256Hex(excerpt),
        retrievedAt: repaired.firstSeen,
        trust: "secondary" as const,
        injectionSuspected: false,
      };
    });

    // 3) Typed table content from capability output
    const table: TypedTableContent = {
      columns: [
        { id: "customerId", name: "Customer", type: "string" },
        { id: "impact", name: "Impact", type: "string" },
      ],
      rows: repaired.affectedCustomers.map((cus) => ({
        rowId: cus,
        cells: { customerId: cus, impact: "annual_checkout_failed" },
        evidenceRefs: [evidenceId(`ev-${cus}`)],
      })),
      warnings: [],
    };

    const content = JSON.stringify(table);
    const v1 = service.update(session, {
      artifactId: artifact.id,
      baseVersionId: null,
      content,
      changeSummary: `checkout-error-log-analyzer v1.1.0 → ${repaired.distinctCount} distinct customers`,
      authorType: "capability",
      authorRef: "checkout-error-log-analyzer@1.1.0",
      contentFormat: "json",
      sourceEventRange: { from: 0, to: 40 },
    });

    expect(v1.version.ordinal).toBe(1);
    expect(v1.version.sha256).toBe(sha256Hex(content));
    expect(v1.version.contentInline).toBe(content);
    expect(v1.artifact.status).toBe("drafting");
    expect(v1.artifact.currentVersionId).toBe(v1.version.id);

    // Immutable: second version does not mutate v1
    const summaryDoc = `# Impact\n\n${repaired.distinctCount} distinct customers hit annual checkout failure.\n`;
    const doc = service.create(session, {
      assignmentId: ASSIGNMENT,
      runId: RUN,
      coworkerId: COWORKER,
      type: "document.markdown",
      title: "Incident report — annual checkout",
    });
    // Attach one evidence anchor per affected customer (table lineage)
    for (const cus of repaired.affectedCustomers) {
      service.attachEvidence(session, {
        artifactId: artifact.id,
        anchor: `customer:${cus}`,
        evidenceIds: [evidenceId(`ev-${cus}`)],
      });
    }

    const ready = service.requestReview(session, artifact.id);
    expect(ready.status).toBe("ready_for_review");

    const read = service.read(session, artifact.id);
    expect(read).not.toBeNull();
    if (!read) throw new Error("expected artifact read");
    expect(read.version?.id).toBe(v1.version.id);
    expect(read.content).toBe(content);
    expect(Object.keys(read.evidenceByAnchor).length).toBe(repaired.distinctCount);

    // 4) Evidence resolution for table rows
    expect(read.content).toBeTruthy();
    const parsed = JSON.parse(read.content as string) as TypedTableContent;
    for (const row of parsed.rows) {
      const resolved = resolveRowEvidence(row.evidenceRefs ?? [], evidenceRecords);
      expect(resolved).toHaveLength(1);
      expect(resolved[0]?.supported).toBe(true);
      expect(resolved[0]?.unsupported).toBe(false);
    }

    // 5) Provenance graph: artifact → capability version + evidence + run
    const graph = buildProvenanceGraph(
      artifact.id,
      [
        {
          fromId: artifact.id,
          toId: RUN,
          relation: "source_run",
          label: "assignment run",
        },
        {
          fromId: artifact.id,
          toId: "cap-checkout-error-log-analyzer-v1.1.0",
          relation: "capability_version",
          label: "checkout-error-log-analyzer@1.1.0",
        },
        ...evidenceRecords.map((ev) => ({
          fromId: artifact.id,
          toId: ev.id,
          relation: "evidence" as const,
          label: ev.title,
        })),
      ],
      evidenceRecords.map((ev) => ({
        id: ev.id,
        title: ev.title,
        trust: ev.trust,
        sourceUrl: ev.sourceUrl,
      })),
      [
        {
          id: v1.version.id,
          artifactId: artifact.id,
          ordinal: v1.version.ordinal,
          sha256: v1.version.sha256,
          changeSummary: v1.version.changeSummary,
        },
      ],
    );

    expect(graph.rootId).toBe(artifact.id);
    expect(graph.nodes.some((n) => n.id === artifact.id)).toBe(true);
    expect(graph.nodes.some((n) => n.kind === "capability_version")).toBe(true);
    expect(graph.nodes.filter((n) => n.kind === "evidence").length).toBeGreaterThanOrEqual(9);
    expect(graph.edges.some((e) => e.relation === "source_run")).toBe(true);
    expect(graph.edges.some((e) => e.relation === "capability_version")).toBe(true);

    // 6) Renderer consumes the artifact content
    expect(resolveRenderer("table.typed")).toBe("typed-table");
    const metrics = tableMetrics(parsed);
    expect(metrics.rows).toBe(9);
    const csv = exportCsv(parsed);
    expect(csv.split("\n").length).toBeGreaterThanOrEqual(10); // header + 9 rows
    for (const cus of repaired.affectedCustomers) {
      expect(csv).toContain(cus);
    }

    // Stale base still rejected (lineage integrity)
    expect(() =>
      service.update(session, {
        artifactId: artifact.id,
        baseVersionId: null,
        content: "{}",
        changeSummary: "should fail",
        authorType: "agent",
        authorRef: "agent",
      }),
    ).toThrow();

    // silence unused
    expect(doc.status).toBe("declared");
    expect(summaryDoc.length).toBeGreaterThan(0);
  });
});
