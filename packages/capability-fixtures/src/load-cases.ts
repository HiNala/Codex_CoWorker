import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ApiChangeImpactCase, TrustedFixtureCase } from "./types";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadJsonCases(slug: string): TrustedFixtureCase[] {
  const dir = join(packageRoot, slug, "cases");
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
  return files.map((file) => {
    const raw = readFileSync(join(dir, file), "utf8");
    return JSON.parse(raw) as TrustedFixtureCase;
  });
}

export function loadApiChangeImpactCases(): ApiChangeImpactCase[] {
  return loadJsonCases("api-change-impact-analyzer") as ApiChangeImpactCase[];
}

export function loadTicketClusterCases(): TrustedFixtureCase[] {
  return loadJsonCases("ticket-cluster-analyzer");
}

export function loadCustomerImpactCases(): TrustedFixtureCase[] {
  return loadJsonCases("customer-impact-mapper");
}

export function loadIncidentReportCases(): TrustedFixtureCase[] {
  return loadJsonCases("incident-report-composer");
}

export function loadReleaseNoteCases(): TrustedFixtureCase[] {
  return loadJsonCases("release-note-drafter");
}

export function casesDirFor(slug: string): string {
  return join(packageRoot, slug, "cases");
}
