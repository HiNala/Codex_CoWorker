import type { EvidenceRecord } from "@forge/contracts";

/** Trust levels, ordered strongest → weakest in TRUST_RANK (see trust.ts). */
export type EvidenceTrust = EvidenceRecord["trust"];

/**
 * Anchor attached to a claim (markdown citation chip or table cell/row ref).
 * Does not embed the evidence body — only the pointer used for resolution.
 */
export type EvidenceAnchor = {
  /** Stable anchor id, e.g. "e1" or a cell path like "row:3:col:arr". */
  anchorId: string;
  /** Evidence record id this anchor intends to cite. */
  evidenceId: string;
  /** Optional claim text the anchor supports. */
  claim?: string;
  /** Optional span within the excerpt to highlight in the panel. */
  excerptSpan?: { start: number; end: number };
};

/** Mapping from a markdown citation marker to an evidence record. */
export type CitationLink = {
  anchorId: string;
  evidenceId: string;
  claim?: string;
};

/**
 * Result of resolving an evidence id or citation against known records.
 * Missing / unmatched refs must yield an unsupported marker — never fabricate.
 */
export type EvidenceResolution =
  | {
      supported: true;
      unsupported: false;
      evidenceId: string;
      anchorId?: string;
      record: EvidenceRecord;
      claim?: string;
      excerptSpan?: { start: number; end: number };
    }
  | {
      supported: false;
      unsupported: true;
      evidenceId: string | null;
      anchorId?: string;
      claim?: string;
      reason: "missing_evidence" | "missing_citation" | "empty_ref";
    };

export type UnsupportedMarker = {
  unsupported: true;
  evidenceId?: string | null;
  anchorId?: string;
  reason: EvidenceResolution extends { reason: infer R } ? R : never;
};
