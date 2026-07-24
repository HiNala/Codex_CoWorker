/**
 * Rigel GOLDEN-ARTIFACT table.typed payload builder.
 * Matches packages/capability-fixtures/checkout-error-log-analyzer/GOLDEN-ARTIFACT.json
 * columns/rows shape Aria TypedTableArtifact consumes.
 */
import type { CheckoutAnalyzeOutput } from "./checkout-analyzer-fake";
import {
  ARTIFACT_TITLE,
  ARTIFACT_TYPE,
  CHECKOUT_ANALYZER_SLUG,
} from "./ids";

/** Stable evidence UUIDs from Rigel golden (order = sorted customer ids). */
const EVIDENCE_BY_CUSTOMER: Record<string, string> = {
  cus_AC2: "c1a3539e-6dad-4e74-adff-d6c8bacb9b94",
  cus_BR3: "5fe779e6-3e9d-492e-a735-9876daef1de1",
  cus_KT4: "a3f21e45-2a0a-42b4-aafc-3687b5aada1d",
  cus_LM5: "08c29624-a300-4dca-a1cf-478f243e656c",
  cus_NW1: "93480525-bada-44a9-a5d8-0e135e938413",
  cus_OP6: "81977e94-2c08-4310-ac60-c0ce109eb9d5",
  cus_QR7: "b4105073-0f27-42c8-a275-9b6d14d68609",
  cus_ST8: "754395f7-cf2b-4686-a78f-278d7bb525f1",
  cus_UV9: "ef41bfeb-696f-4a5d-a8f6-04cba7bdeadb",
};

export interface TypedTableContent {
  columns: Array<{ id: string; name: string; type: string }>;
  rows: Array<{
    rowId: string;
    cells: { customerId: string; impact: string };
    evidenceRefs: string[];
  }>;
  warnings: string[];
}

export function buildTypedTable(output: CheckoutAnalyzeOutput): TypedTableContent {
  return {
    columns: [
      { id: "customerId", name: "Customer", type: "string" },
      { id: "impact", name: "Impact", type: "string" },
    ],
    rows: output.affectedCustomers.map((customerId) => ({
      rowId: customerId,
      cells: { customerId, impact: "annual_checkout_failed" },
      evidenceRefs: EVIDENCE_BY_CUSTOMER[customerId]
        ? [EVIDENCE_BY_CUSTOMER[customerId]!]
        : [],
    })),
    warnings: [],
  };
}

export function buildRigelArtifactSpec(output: CheckoutAnalyzeOutput): {
  type: string;
  title: string;
  description: string;
  content: string;
  authorType: "capability";
  authorRef: string;
  slug: string;
} {
  const table = buildTypedTable(output);
  return {
    type: ARTIFACT_TYPE,
    title: ARTIFACT_TITLE,
    description: ARTIFACT_TITLE,
    content: JSON.stringify(table),
    authorType: "capability",
    authorRef: `${CHECKOUT_ANALYZER_SLUG}@1.0.0`,
    slug: "affected-customers-annual-checkout",
  };
}
