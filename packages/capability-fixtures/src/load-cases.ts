import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CheckoutErrorLogCase } from "../checkout-error-log-analyzer/types";
import { loadCheckoutErrorNdjsonLines } from "../checkout-error-log-analyzer/load-demo-lines";
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

/** Optional / prebuilt only — not the on-stage live-build fail beat. */
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

/**
 * Primary live-build fixtures (23-DEMO-SCENARIO §6).
 * Case 001 injects lines from demo/acme-store/logs/checkout-errors.ndjson.
 */
export function loadCheckoutErrorLogCases(): CheckoutErrorLogCase[] {
  const dir = join(packageRoot, "checkout-error-log-analyzer", "cases");
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
  const demoLines = loadCheckoutErrorNdjsonLines();
  return files.map((file) => {
    const raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as CheckoutErrorLogCase & {
      _linesSource?: string;
    };
    if (raw._linesSource || (file.startsWith("001") && raw.input.lines.length === 0)) {
      raw.input = { ...raw.input, lines: demoLines };
    }
    return {
      description: raw.description,
      input: raw.input,
      expectedOutput: raw.expectedOutput,
    };
  });
}

export function casesDirFor(slug: string): string {
  return join(packageRoot, slug, "cases");
}
