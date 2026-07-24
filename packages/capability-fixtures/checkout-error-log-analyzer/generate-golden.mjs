import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function sha256Hex(s) {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function evidenceId(seed) {
  const h = sha256Hex(seed);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const customers = [
  "cus_AC2",
  "cus_BR3",
  "cus_KT4",
  "cus_LM5",
  "cus_NW1",
  "cus_OP6",
  "cus_QR7",
  "cus_ST8",
  "cus_UV9",
];
const naive = ["cus_AC2", "cus_BR3", "cus_KT4", "cus_NW1"];

const expected = {
  affectedCustomers: customers,
  distinctCount: 9,
  taxonomy: {
    card_declined: 1,
    checkout_failed: 40,
    rate_limit: 2,
    timeout: 1,
  },
  firstSeen: "2026-07-16T09:14:02Z",
  lastSeen: "2026-07-23T15:59:41Z",
};

const ORG = "0198206f-5f53-7000-8000-0000000000a1";
const ASSIGNMENT = "0198206f-5f53-7000-8000-0000000000c1";
const RUN = "0198206f-5f53-7000-8000-0000000000d1";
const COWORKER = "0198206f-5f53-7000-8000-0000000000e1";
const ARTIFACT_ID = "0198206f-5f53-7000-8000-000000000101";
const VERSION_ID = "0198206f-5f53-7000-8000-000000000102";
const CAP_REF = "cap-checkout-error-log-analyzer-v1.0.0";

const evidenceRecords = customers.map((cus) => {
  const excerpt = `checkout_failed for ${cus} within demo window`;
  return {
    id: evidenceId(`ev-${cus}`),
    orgId: ORG,
    kind: "ticket",
    sourceUrl: null,
    title: `Log cluster ${cus}`,
    excerpt,
    contentSha256: sha256Hex(excerpt),
    retrievedAt: expected.firstSeen,
    trust: "secondary",
    injectionSuspected: false,
  };
});

const typedTable = {
  columns: [
    { id: "customerId", name: "Customer", type: "string" },
    { id: "impact", name: "Impact", type: "string" },
  ],
  rows: customers.map((cus) => ({
    rowId: cus,
    cells: { customerId: cus, impact: "annual_checkout_failed" },
    evidenceRefs: [evidenceId(`ev-${cus}`)],
  })),
  warnings: [],
};

const contentInline = JSON.stringify(typedTable);
const contentSha256 = sha256Hex(contentInline);

const evidenceByAnchor = Object.fromEntries(
  customers.map((c) => [`customer:${c}`, [evidenceId(`ev-${c}`)]]),
);

const csvLines = [
  "Customer,Impact",
  ...customers.map((c) => `${c},annual_checkout_failed`),
];

const fixture = {
  schemaVersion: 1,
  name: "golden-artifact-broken-checkout",
  role: "prebuilt",
  note: "War room cut: fifth capability is PREBUILT (not live-built on stage). Single canonical fixture for Cael + Aria.",
  authority: [
    "docs/forge-mission-pack/23-DEMO-SCENARIO-the-broken-checkout.md",
    "docs/agent-briefs/RIGEL-fixture-correction.md",
  ],
  capability: {
    slug: "checkout-error-log-analyzer",
    version: "1.0.0",
    status: "prebuilt_installed",
    logSource: "demo/acme-store/logs/checkout-errors.ndjson",
    window: {
      from: "2026-07-16T00:00:00Z",
      to: "2026-07-23T23:59:59Z",
    },
    rules: {
      filter: "level === 'error' && event === 'checkout_failed'",
      fieldShapes: ["customer_id", "context.customer.id"],
      distractor: {
        line: 22,
        level: "warn",
        event: "card_declined",
        customer_id: "cus_ZZ9",
        note: "load-bearing — do not delete; miss filter → 5/10 not 4/9",
      },
    },
    attempt1_naive: {
      distinctCount: 4,
      affectedCustomers: naive,
      failureMessage: "expected 9, received 4",
      implementation: "Rule1 filter applied; Rule2 top-level customer_id only",
    },
    attempt2_repaired: {
      distinctCount: 9,
      output: expected,
      implementation: "Rule1 filter + Rule2 both field shapes",
    },
    neverInAffectedCustomers: ["cus_ZZ9"],
  },
  artifact: {
    id: ARTIFACT_ID,
    orgId: ORG,
    assignmentId: ASSIGNMENT,
    runId: RUN,
    coworkerId: COWORKER,
    type: "table.typed",
    title: "Affected customers — annual checkout",
    slug: "affected-customers-annual-checkout",
    status: "ready_for_review",
    visibility: "org",
    currentVersionId: VERSION_ID,
    version: {
      id: VERSION_ID,
      ordinal: 1,
      parentVersionId: null,
      authorType: "capability",
      authorRef: "checkout-error-log-analyzer@1.0.0",
      contentFormat: "json",
      changeSummary: "checkout-error-log-analyzer v1.0.0 → 9 distinct customers",
      sourceEventRange: { from: 0, to: 40 },
      contentSha256,
      contentInline,
    },
    typedTable,
    dockMetrics: { rows: 9, warnings: 0, versionLabel: "v1" },
    evidenceByAnchor,
    evidenceRecords,
  },
  provenance: {
    rootId: ARTIFACT_ID,
    nodes: [
      {
        id: ARTIFACT_ID,
        kind: "artifact",
        label: "Affected customers — annual checkout",
      },
      { id: RUN, kind: "run", label: "assignment run" },
      {
        id: CAP_REF,
        kind: "capability_version",
        label: "checkout-error-log-analyzer@1.0.0",
      },
      {
        id: VERSION_ID,
        kind: "artifact_version",
        label: "v1",
        meta: { ordinal: 1, sha256: contentSha256 },
      },
      ...evidenceRecords.map((e) => ({
        id: e.id,
        kind: "evidence",
        label: e.title,
        meta: { trust: e.trust },
      })),
    ],
    edges: [
      { fromId: ARTIFACT_ID, toId: RUN, relation: "source_run" },
      { fromId: ARTIFACT_ID, toId: CAP_REF, relation: "capability_version" },
      { fromId: ARTIFACT_ID, toId: VERSION_ID, relation: "input_artifact" },
      ...evidenceRecords.map((e) => ({
        fromId: ARTIFACT_ID,
        toId: e.id,
        relation: "evidence",
      })),
    ],
  },
  renderer: {
    type: "table.typed",
    registryKey: "typed-table",
    csvHeader: "Customer,Impact",
    csv: csvLines.join("\n"),
    expectsNineDataRows: true,
  },
  consumption: {
    cael: {
      file: "packages/capability-fixtures/checkout-error-log-analyzer/GOLDEN-ARTIFACT.json",
      trustedCompare:
        "Deep-equal capability.execute result to capability.attempt2_repaired.output",
      attempt1Message: "expected 9, received 4",
      prebuilt: true,
      imports: {
        naive: "naiveAnalyzeCheckoutErrors from @forge/capability-fixtures",
        repaired: "referenceAnalyzeCheckoutErrors from @forge/capability-fixtures",
        lines:
          "loadCheckoutErrorNdjsonLines() or demo/acme-store/logs/checkout-errors.ndjson",
      },
      seedHint:
        "May seed verifier from this file without re-running the analyzer if needed for parachute",
    },
    aria: {
      dockCard: {
        type: "table.typed",
        title: "Affected customers — annual checkout",
        status: "ready_for_review",
        metrics: "9 rows · 0 warnings · v1",
      },
      canvas: {
        parse: "JSON.parse(artifact.version.contentInline) as TypedTableContent",
        renderer: "resolveRenderer('table.typed') === 'typed-table'",
        rowClick:
          "evidenceByAnchor['customer:' + row.rowId] → look up evidenceRecords by id",
      },
      evidencePanel: ["title", "trust", "contentSha256", "excerpt", "retrievedAt"],
      provenance: "Render provenance.nodes + provenance.edges; rootId = artifact.id",
      doNotHardcode:
        "Never hardcode the number 9 in UI copy — use distinctCount / dockMetrics.rows",
    },
  },
};

const out = join(dirname(fileURLToPath(import.meta.url)), "GOLDEN-ARTIFACT.json");
writeFileSync(out, `${JSON.stringify(fixture, null, 2)}\n`);
console.log("wrote", out);
console.log("contentSha256", contentSha256);
console.log("rows", typedTable.rows.length);
