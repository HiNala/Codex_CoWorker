import { fnv1aHex } from "@forge/capability-sdk";
import { computeSeverity } from "./severity";
import type {
  Account,
  ImpactMapperInput,
  ImpactMapperOutput,
  ImpactRow,
} from "./types";

interface Accu {
  account: Account;
  clusterIds: Set<string>;
  ticketIds: Set<string>;
}

/**
 * Map clusters → accounts via ticketRequesterIndex and contact ids.
 * Tickets with unknown requesters are counted as unmatched (logged) and skipped.
 */
export function mapImpact(
  input: ImpactMapperInput,
  log: (level: "debug" | "info" | "warn", message: string) => void,
): ImpactMapperOutput {
  const contactToAccount = new Map<string, Account>();
  for (const account of input.accounts) {
    for (const contact of account.contacts) {
      contactToAccount.set(contact.id, account);
    }
  }

  const byAccount = new Map<string, Accu>();
  let unmatched = 0;

  for (const cluster of input.clusters) {
    for (const ticketId of cluster.ticketIds) {
      const requesterId = input.ticketRequesterIndex[ticketId];
      if (requesterId === undefined) {
        unmatched += 1;
        log("debug", `ticket ${ticketId} has no requester mapping`);
        continue;
      }
      const account = contactToAccount.get(requesterId);
      if (!account) {
        unmatched += 1;
        log("debug", `requester ${requesterId} matches no account contact`);
        continue;
      }
      let accu = byAccount.get(account.id);
      if (!accu) {
        accu = {
          account,
          clusterIds: new Set(),
          ticketIds: new Set(),
        };
        byAccount.set(account.id, accu);
      }
      accu.clusterIds.add(cluster.clusterId);
      accu.ticketIds.add(ticketId);
    }
  }

  if (unmatched > 0) {
    log("info", `${unmatched} ticket(s) unmatched to any account`);
  }

  const rows: ImpactRow[] = [];
  for (const accu of byAccount.values()) {
    const affectedClusterIds = [...accu.clusterIds].sort((a, b) =>
      a.localeCompare(b),
    );
    const evidenceRefs = [...accu.ticketIds].sort((a, b) => a.localeCompare(b));
    const ticketCount = evidenceRefs.length;
    const mrrAtRiskMicrodollars = accu.account.mrrMicrodollars;
    const severity = computeSeverity(
      accu.account.plan,
      ticketCount,
      mrrAtRiskMicrodollars,
    );
    const rowId = `row_${fnv1aHex(
      `${accu.account.id}|${affectedClusterIds.join(",")}`,
    )}`;
    rows.push({
      rowId,
      accountId: accu.account.id,
      accountName: accu.account.name,
      plan: accu.account.plan,
      affectedClusterIds,
      ticketCount,
      mrrAtRiskMicrodollars,
      severity,
      evidenceRefs,
    });
  }

  // Sort rows: severity rank then accountId for stability
  const severityRank: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  rows.sort((a, b) => {
    const sr = (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
    if (sr !== 0) return sr;
    return a.accountId.localeCompare(b.accountId);
  });

  const ticketSet = new Set<string>();
  let mrrSum = 0;
  for (const row of rows) {
    for (const t of row.evidenceRefs) ticketSet.add(t);
    mrrSum += row.mrrAtRiskMicrodollars;
  }

  log("info", `mapped ${rows.length} account rows (${unmatched} unmatched tickets)`);

  return {
    rows,
    totals: {
      accounts: rows.length,
      tickets: ticketSet.size,
      mrrAtRiskMicrodollars: mrrSum,
    },
  };
}
