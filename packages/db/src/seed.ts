import { eq } from "drizzle-orm";
import { pathToFileURL } from "node:url";
import { createDatabase } from "./client";
import {
  artifactVersions,
  artifacts,
  assignmentRuns,
  assignments,
  capabilities,
  capabilityVersions,
  coworkers,
  creditAccounts,
  creditLedgerEntries,
  memberships,
  organizations,
  projects,
  users,
} from "./schema";

export const DEMO_IDS = {
  org: "0198206f-5f53-7000-8000-000000000001",
  user: "0198206f-5f53-7000-8000-000000000002",
  coworker: "0198206f-5f53-7000-8000-000000000003",
  project: "0198206f-5f53-7000-8000-000000000004",
  activeAssignment: "0198206f-5f53-7000-8000-000000000005",
  activeRun: "0198206f-5f53-7000-8000-000000000006",
  historyAssignmentOne: "0198206f-5f53-7000-8000-000000000007",
  historyRunOne: "0198206f-5f53-7000-8000-000000000008",
  historyAssignmentTwo: "0198206f-5f53-7000-8000-000000000009",
  historyRunTwo: "0198206f-5f53-7000-8000-00000000000a",
  creditAccount: "0198206f-5f53-7000-8000-00000000000b",
} as const;

const capabilitySeeds = [
  ["ticket-clusterer", "Ticket clusterer", "workflow"],
  ["customer-impact-mapper", "Customer impact mapper", "skill"],
  ["release-note-drafter", "Release note drafter", "skill"],
  ["repository-change-proposer", "Repository change proposer", "workflow"],
] as const;

export async function seedDatabase(databaseUrl: string): Promise<void> {
  const { db, client } = createDatabase(databaseUrl, { max: 1 });

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(organizations)
        .values({ id: DEMO_IDS.org, name: "Acme Payments", slug: "acme-payments" })
        .onConflictDoNothing();

      await tx
        .insert(users)
        .values({ id: DEMO_IDS.user, email: "demo@forge.dev", displayName: "Demo Owner" })
        .onConflictDoNothing();

      await tx
        .insert(memberships)
        .values({ orgId: DEMO_IDS.org, userId: DEMO_IDS.user, role: "owner" })
        .onConflictDoNothing();

      await tx
        .insert(coworkers)
        .values({
          id: DEMO_IDS.coworker,
          orgId: DEMO_IDS.org,
          name: "Nala",
          charter:
            "Support engineering coworker for the Payments platform. Investigates customer-reported breakages, produces incident reports, and ships verified fixes.",
          status: "idle",
          monthlyBudgetMicrocredits: 100_000_000,
          perAssignmentCeilingMicrocredits: 10_000_000,
          identitySeed: "nala-acme-payments-v1",
        })
        .onConflictDoNothing();

      await tx
        .insert(projects)
        .values({
          id: DEMO_IDS.project,
          orgId: DEMO_IDS.org,
          name: "AcmePay Platform",
          slug: "acmepay-platform",
          description: "Checkout, billing, and customer support systems.",
          repositories: ["acme/acme-store"],
        })
        .onConflictDoNothing();

      await tx
        .insert(assignments)
        .values([
          {
            id: DEMO_IDS.activeAssignment,
            orgId: DEMO_IDS.org,
            coworkerId: DEMO_IDS.coworker,
            projectId: DEMO_IDS.project,
            rawRequest: "Find out why customers cannot buy the annual plan and prepare a fix.",
            status: "approved",
            source: "demo",
            ceilingMicrocredits: 5_000_000,
          },
          {
            id: DEMO_IDS.historyAssignmentOne,
            orgId: DEMO_IDS.org,
            coworkerId: DEMO_IDS.coworker,
            projectId: DEMO_IDS.project,
            rawRequest: "Summarize the payment retry incident and its customer impact.",
            status: "completed",
            source: "web",
            ceilingMicrocredits: 2_000_000,
            spentMicrocredits: 842_000,
          },
          {
            id: DEMO_IDS.historyAssignmentTwo,
            orgId: DEMO_IDS.org,
            coworkerId: DEMO_IDS.coworker,
            projectId: DEMO_IDS.project,
            rawRequest: "Prepare release notes for the checkout recovery changes.",
            status: "completed",
            source: "web",
            ceilingMicrocredits: 1_000_000,
            spentMicrocredits: 316_000,
          },
        ])
        .onConflictDoNothing();

      await tx
        .insert(assignmentRuns)
        .values([
          {
            id: DEMO_IDS.activeRun,
            orgId: DEMO_IDS.org,
            assignmentId: DEMO_IDS.activeAssignment,
            status: "queued",
          },
          {
            id: DEMO_IDS.historyRunOne,
            orgId: DEMO_IDS.org,
            assignmentId: DEMO_IDS.historyAssignmentOne,
            status: "completed",
          },
          {
            id: DEMO_IDS.historyRunTwo,
            orgId: DEMO_IDS.org,
            assignmentId: DEMO_IDS.historyAssignmentTwo,
            status: "completed",
          },
        ])
        .onConflictDoNothing();

      for (const [index, [slug, name, kind]] of capabilitySeeds.entries()) {
        const capabilityId = `0198206f-5f53-7000-8000-0000000001${index.toString(16).padStart(2, "0")}`;
        const versionId = `0198206f-5f53-7000-8000-0000000002${index.toString(16).padStart(2, "0")}`;
        await tx
          .insert(capabilities)
          .values({
            id: capabilityId,
            orgId: DEMO_IDS.org,
            slug,
            name,
            description: `${name} installed with the demo coworker.`,
            kind,
            status: "installed",
            currentVersionId: versionId,
          })
          .onConflictDoNothing();
        await tx
          .insert(capabilityVersions)
          .values({
            id: versionId,
            orgId: DEMO_IDS.org,
            capabilityId,
            version: "1.0.0",
            manifest: { schemaVersion: 1, slug, runtime: "node22" },
            bundleSha256: `${index + 1}`.repeat(64),
            authoredBy: "human",
            isCurrent: 1,
          })
          .onConflictDoNothing();
      }

      const historyArtifacts = [
        {
          id: "0198206f-5f53-7000-8000-000000000301",
          versionId: "0198206f-5f53-7000-8000-000000000401",
          assignmentId: DEMO_IDS.historyAssignmentOne,
          runId: DEMO_IDS.historyRunOne,
          title: "Payment retry incident report",
          slug: "payment-retry-incident-report",
          body: "# Payment retry incident\n\nRecovered without data loss. Evidence is retained.",
        },
        {
          id: "0198206f-5f53-7000-8000-000000000302",
          versionId: "0198206f-5f53-7000-8000-000000000402",
          assignmentId: DEMO_IDS.historyAssignmentTwo,
          runId: DEMO_IDS.historyRunTwo,
          title: "Checkout recovery release notes",
          slug: "checkout-recovery-release-notes",
          body: "# Checkout recovery\n\nAnnual checkout now validates plan cadence consistently.",
        },
      ] as const;

      for (const artifact of historyArtifacts) {
        await tx
          .insert(artifacts)
          .values({
            id: artifact.id,
            orgId: DEMO_IDS.org,
            projectId: DEMO_IDS.project,
            assignmentId: artifact.assignmentId,
            runId: artifact.runId,
            coworkerId: DEMO_IDS.coworker,
            type: "document.markdown",
            title: artifact.title,
            slug: artifact.slug,
            status: "delivered",
            currentVersionId: artifact.versionId,
            approvedVersionId: artifact.versionId,
            searchText: `${artifact.title} ${artifact.body}`,
          })
          .onConflictDoNothing();
        await tx
          .insert(artifactVersions)
          .values({
            id: artifact.versionId,
            orgId: DEMO_IDS.org,
            artifactId: artifact.id,
            parentVersionId: null,
            ordinal: 1,
            authorType: "agent",
            authorRef: DEMO_IDS.coworker,
            contentFormat: "markdown",
            contentInline: artifact.body,
            objectKey: null,
            sha256: "a".repeat(64),
            changeSummary: "Initial delivered version.",
            sourceEventFrom: 1,
            sourceEventTo: 1,
          })
          .onConflictDoNothing();
      }

      await tx
        .insert(creditAccounts)
        .values({
          id: DEMO_IDS.creditAccount,
          orgId: DEMO_IDS.org,
          balanceMicrocredits: 98_842_000,
        })
        .onConflictDoNothing();

      await tx
        .insert(creditLedgerEntries)
        .values([
          {
            id: "0198206f-5f53-7000-8000-000000000501",
            orgId: DEMO_IDS.org,
            accountId: DEMO_IDS.creditAccount,
            runId: null,
            entryGroupId: "0198206f-5f53-7000-8000-000000000511",
            amountMicrocredits: 100_000_000,
            balanceAfterMicrocredits: 100_000_000,
            reason: "Demo account opening balance",
            idempotencyKey: "demo-opening-balance",
          },
          {
            id: "0198206f-5f53-7000-8000-000000000502",
            orgId: DEMO_IDS.org,
            accountId: DEMO_IDS.creditAccount,
            runId: DEMO_IDS.historyRunOne,
            entryGroupId: "0198206f-5f53-7000-8000-000000000512",
            amountMicrocredits: -842_000,
            balanceAfterMicrocredits: 99_158_000,
            reason: "Payment retry incident assignment",
            idempotencyKey: "demo-history-run-one-settlement",
          },
          {
            id: "0198206f-5f53-7000-8000-000000000503",
            orgId: DEMO_IDS.org,
            accountId: DEMO_IDS.creditAccount,
            runId: DEMO_IDS.historyRunTwo,
            entryGroupId: "0198206f-5f53-7000-8000-000000000513",
            amountMicrocredits: -316_000,
            balanceAfterMicrocredits: 98_842_000,
            reason: "Checkout release notes assignment",
            idempotencyKey: "demo-history-run-two-settlement",
          },
        ])
        .onConflictDoNothing();

      await tx.update(coworkers).set({ status: "idle" }).where(eq(coworkers.id, DEMO_IDS.coworker));
    });
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed the database.");
  }

  await seedDatabase(databaseUrl);
  console.log(`Demo seed is ready. Assignment: ${DEMO_IDS.activeAssignment}`);
}
