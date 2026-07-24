import type { Artifact, ArtifactStatus, ArtifactType, ArtifactVersion } from "@forge/contracts";

/**
 * In-memory seed for Outputs Library + /api/artifacts until ArtifactService is wired.
 * Two historical artifacts from prior assignments so /outputs is never empty.
 */
export type SeedArtifactDetail = {
  artifact: Artifact;
  versions: ArtifactVersion[];
  evidence: Array<{
    id: string;
    title: string;
    kind: string;
    trust: string;
    sourceUrl: string | null;
    excerpt: string;
    contentSha256: string;
    retrievedAt: string;
  }>;
  provenance: Array<{
    relation:
      | "input_artifact"
      | "evidence"
      | "capability_version"
      | "tool_invocation"
      | "human_edit"
      | "approval"
      | "source_run";
    toId: string;
    label: string;
  }>;
  summary: string;
};

const ORG = "0198206f-5f53-7000-8000-000000000001";
const PROJECT = "0198206f-5f53-7000-8000-000000000002";
const COWORKER = "0198206f-5f53-7000-8000-000000000003";

const ARTIFACT_REPORT = "0198206f-5f53-7000-8000-000000000741";
const ARTIFACT_TABLE = "0198206f-5f53-7000-8000-000000000742";
const VERSION_REPORT = "0198206f-5f53-7000-8000-000000000751";
const VERSION_TABLE = "0198206f-5f53-7000-8000-000000000752";
const ASSIGNMENT_PRIOR = "0198206f-5f53-7000-8000-000000000511";
const ASSIGNMENT_PRIOR_2 = "0198206f-5f53-7000-8000-000000000512";
const RUN_PRIOR = "0198206f-5f53-7000-8000-000000000521";
const RUN_PRIOR_2 = "0198206f-5f53-7000-8000-000000000522";
const EVIDENCE_1 = "0198206f-5f53-7000-8000-000000000601";
const EVIDENCE_2 = "0198206f-5f53-7000-8000-000000000602";

const SHA_REPORT = "e1".padEnd(64, "0");
const SHA_TABLE = "e2".padEnd(64, "0");
const SHA_EV1 = "a".repeat(64);
const SHA_EV2 = "b".repeat(64);

function artifact(partial: {
  id: string;
  assignmentId: string;
  runId: string;
  type: ArtifactType;
  title: string;
  slug: string;
  status: ArtifactStatus;
  currentVersionId: string;
  createdAt: string;
  updatedAt: string;
}): Artifact {
  return {
    id: partial.id,
    orgId: ORG,
    projectId: PROJECT,
    assignmentId: partial.assignmentId,
    runId: partial.runId,
    coworkerId: COWORKER,
    type: partial.type,
    title: partial.title,
    slug: partial.slug,
    status: partial.status,
    visibility: "org",
    currentVersionId: partial.currentVersionId,
    approvedVersionId: partial.currentVersionId,
    createdAt: partial.createdAt,
    updatedAt: partial.updatedAt,
  };
}

function version(partial: {
  id: string;
  artifactId: string;
  ordinal: number;
  contentFormat: "markdown" | "json" | "diff";
  contentInline: string;
  sha256: string;
  changeSummary: string;
  createdAt: string;
}): ArtifactVersion {
  return {
    id: partial.id,
    artifactId: partial.artifactId,
    parentVersionId: null,
    ordinal: partial.ordinal,
    authorType: "agent",
    authorRef: "nala",
    contentFormat: partial.contentFormat,
    contentInline: partial.contentInline,
    objectKey: null,
    sha256: partial.sha256,
    changeSummary: partial.changeSummary,
    sourceEventRange: { from: 0, to: 12 },
    createdAt: partial.createdAt,
  };
}

export const SEED_ARTIFACTS: SeedArtifactDetail[] = [
  {
    artifact: artifact({
      id: ARTIFACT_REPORT,
      assignmentId: ASSIGNMENT_PRIOR,
      runId: RUN_PRIOR,
      type: "document.markdown",
      title: "Q2 billing incident report",
      slug: "q2-billing-incident-report",
      status: "approved",
      currentVersionId: VERSION_REPORT,
      createdAt: "2026-06-12T14:22:00.000Z",
      updatedAt: "2026-06-12T16:05:00.000Z",
    }),
    versions: [
      version({
        id: VERSION_REPORT,
        artifactId: ARTIFACT_REPORT,
        ordinal: 1,
        contentFormat: "markdown",
        contentInline:
          "# Q2 billing incident\n\nCheckout rejected `yearly` cadence keys.[^e1]\n\nSupport volume clustered on annual plan failures.[^e2]\n",
        sha256: SHA_REPORT,
        changeSummary: "Initial approved incident report",
        createdAt: "2026-06-12T16:05:00.000Z",
      }),
    ],
    evidence: [
      {
        id: EVIDENCE_1,
        title: "Checkout cadence contract",
        kind: "web",
        trust: "official",
        sourceUrl: "https://docs.example.test/checkout/cadence",
        excerpt: "The supported cadence key is annual; yearly is not recognized.",
        contentSha256: SHA_EV1,
        retrievedAt: "2026-06-12T14:40:00.000Z",
      },
      {
        id: EVIDENCE_2,
        title: "Ticket cluster: annual checkout",
        kind: "ticket",
        trust: "secondary",
        sourceUrl: null,
        excerpt: "Twelve tickets share the same checkout failure signature.",
        contentSha256: SHA_EV2,
        retrievedAt: "2026-06-12T14:55:00.000Z",
      },
    ],
    provenance: [
      { relation: "evidence", toId: EVIDENCE_1, label: "Checkout cadence contract" },
      { relation: "evidence", toId: EVIDENCE_2, label: "Ticket cluster: annual checkout" },
      { relation: "source_run", toId: RUN_PRIOR, label: "Assignment run" },
      {
        relation: "capability_version",
        toId: "0198206f-5f53-7000-8000-000000000801",
        label: "ticket-clusterer@1.0.0",
      },
      {
        relation: "approval",
        toId: "0198206f-5f53-7000-8000-000000000721",
        label: "Owner approved delivery",
      },
    ],
    summary: "Historical incident write-up with citations into checkout docs and support tickets.",
  },
  {
    artifact: artifact({
      id: ARTIFACT_TABLE,
      assignmentId: ASSIGNMENT_PRIOR_2,
      runId: RUN_PRIOR_2,
      type: "table.typed",
      title: "Affected enterprise accounts",
      slug: "affected-enterprise-accounts",
      status: "delivered",
      currentVersionId: VERSION_TABLE,
      createdAt: "2026-05-03T09:10:00.000Z",
      updatedAt: "2026-05-03T11:40:00.000Z",
    }),
    versions: [
      version({
        id: VERSION_TABLE,
        artifactId: ARTIFACT_TABLE,
        ordinal: 2,
        contentFormat: "json",
        contentInline: JSON.stringify({
          columns: [
            { id: "account", type: "string" },
            { id: "arr", type: "number" },
            { id: "tickets", type: "number" },
          ],
          rows: [
            {
              id: "r1",
              cells: { account: "Northwind", arr: 240000, tickets: 4 },
              evidenceRefs: [EVIDENCE_2],
            },
            {
              id: "r2",
              cells: { account: "Contoso", arr: 180000, tickets: 3 },
              evidenceRefs: [EVIDENCE_2],
            },
          ],
        }),
        sha256: SHA_TABLE,
        changeSummary: "Add ARR column and per-row evidence refs",
        createdAt: "2026-05-03T11:40:00.000Z",
      }),
    ],
    evidence: [
      {
        id: EVIDENCE_2,
        title: "Ticket cluster: annual checkout",
        kind: "ticket",
        trust: "secondary",
        sourceUrl: null,
        excerpt: "Twelve tickets share the same checkout failure signature.",
        contentSha256: SHA_EV2,
        retrievedAt: "2026-05-03T09:30:00.000Z",
      },
    ],
    provenance: [
      { relation: "evidence", toId: EVIDENCE_2, label: "Ticket cluster: annual checkout" },
      { relation: "source_run", toId: RUN_PRIOR_2, label: "Assignment run" },
      {
        relation: "tool_invocation",
        toId: "0198206f-5f53-7000-8000-000000000901",
        label: "artifact.create_version",
      },
    ],
    summary: "Typed impact table with per-row evidence refs from a prior assignment.",
  },
];

export function listSeedArtifacts(): Artifact[] {
  return SEED_ARTIFACTS.map((s) => s.artifact);
}

export function getSeedArtifact(id: string): SeedArtifactDetail | undefined {
  return SEED_ARTIFACTS.find((s) => s.artifact.id === id);
}

export type ArtifactListItem = Pick<
  Artifact,
  "id" | "title" | "type" | "status" | "slug" | "assignmentId" | "createdAt" | "updatedAt"
> & { summary: string };

export function listSeedArtifactItems(): ArtifactListItem[] {
  return SEED_ARTIFACTS.map((s) => ({
    id: s.artifact.id,
    title: s.artifact.title,
    type: s.artifact.type,
    status: s.artifact.status,
    slug: s.artifact.slug,
    assignmentId: s.artifact.assignmentId,
    createdAt: s.artifact.createdAt,
    updatedAt: s.artifact.updatedAt,
    summary: s.summary,
  }));
}
