import type { EvidenceRecord } from "@forge/contracts";
import type { CitationLink, EvidenceResolution } from "./types";

function indexById(records: readonly EvidenceRecord[]): Map<string, EvidenceRecord> {
  const map = new Map<string, EvidenceRecord>();
  for (const record of records) {
    map.set(record.id, record);
  }
  return map;
}

function supported(
  record: EvidenceRecord,
  extras?: {
    anchorId?: string;
    claim?: string;
    excerptSpan?: { start: number; end: number };
  },
): EvidenceResolution {
  return {
    supported: true,
    unsupported: false,
    evidenceId: record.id,
    record,
    anchorId: extras?.anchorId,
    claim: extras?.claim,
    excerptSpan: extras?.excerptSpan,
  };
}

function unsupported(input: {
  evidenceId: string | null;
  anchorId?: string;
  claim?: string;
  reason: "missing_evidence" | "missing_citation" | "empty_ref";
}): EvidenceResolution {
  return {
    supported: false,
    unsupported: true,
    evidenceId: input.evidenceId,
    anchorId: input.anchorId,
    claim: input.claim,
    reason: input.reason,
  };
}

/**
 * Resolve a list of evidence ids against known records.
 * Missing ids yield unsupported markers — never fabricate records.
 * Order of `ids` is preserved; duplicates are resolved independently.
 */
export function resolveEvidence(
  records: readonly EvidenceRecord[],
  ids: readonly string[],
): EvidenceResolution[] {
  const byId = indexById(records);
  return ids.map((id) => {
    if (!id) {
      return unsupported({ evidenceId: null, reason: "empty_ref" });
    }
    const record = byId.get(id);
    if (!record) {
      return unsupported({ evidenceId: id, reason: "missing_evidence" });
    }
    return supported(record);
  });
}

/**
 * Resolve per-row (or per-cell) evidenceRefs for a typed table.
 * Same semantics as resolveEvidence — missing refs stay unsupported.
 */
export function resolveRowEvidence(
  rowEvidenceRefs: readonly string[],
  records: readonly EvidenceRecord[],
): EvidenceResolution[] {
  return resolveEvidence(records, rowEvidenceRefs);
}

/**
 * Normalize a markdown citation anchor into an anchorId.
 * Accepts: `[^e1]`, `[e1]`, `e1`, `^e1`.
 */
export function normalizeMarkdownAnchor(markdownAnchor: string): string {
  const trimmed = markdownAnchor.trim();
  const footnote = trimmed.match(/^\[\^([^\]]+)\]$/);
  if (footnote) return footnote[1]!;
  const bracketed = trimmed.match(/^\[([^\]]+)\]$/);
  if (bracketed) return bracketed[1]!.replace(/^\^/, "");
  return trimmed.replace(/^\^/, "");
}

/**
 * Resolve a markdown citation chip against the citation map and evidence corpus.
 * Returns either a full resolution or a bare `{ unsupported: true }` when the
 * anchor has no citation entry (claim is unsupported — do not invent a source).
 */
export function resolveCitation(
  markdownAnchor: string,
  citations: readonly CitationLink[] | readonly { anchorId: string; evidenceId: string }[],
  records: readonly EvidenceRecord[],
): EvidenceResolution | { unsupported: true } {
  const anchorId = normalizeMarkdownAnchor(markdownAnchor);
  if (!anchorId) {
    return { unsupported: true };
  }

  const link = citations.find((c) => c.anchorId === anchorId);
  if (!link) {
    return { unsupported: true };
  }

  const byId = indexById(records);
  const record = byId.get(link.evidenceId);
  if (!record) {
    return unsupported({
      evidenceId: link.evidenceId,
      anchorId,
      claim: "claim" in link ? (link as CitationLink).claim : undefined,
      reason: "missing_evidence",
    });
  }

  return supported(record, {
    anchorId,
    claim: "claim" in link ? (link as CitationLink).claim : undefined,
  });
}

/**
 * Resolve a full set of citation links (e.g. report footer) against records.
 * Every link produces a resolution; missing evidence → unsupported marker.
 */
export function resolveAllCitations(
  citations: readonly CitationLink[],
  records: readonly EvidenceRecord[],
): EvidenceResolution[] {
  const byId = indexById(records);
  return citations.map((link) => {
    if (!link.anchorId || !link.evidenceId) {
      return unsupported({
        evidenceId: link.evidenceId || null,
        anchorId: link.anchorId || undefined,
        claim: link.claim,
        reason: "empty_ref",
      });
    }
    const record = byId.get(link.evidenceId);
    if (!record) {
      return unsupported({
        evidenceId: link.evidenceId,
        anchorId: link.anchorId,
        claim: link.claim,
        reason: "missing_evidence",
      });
    }
    return supported(record, { anchorId: link.anchorId, claim: link.claim });
  });
}

/** True when every resolution is supported (no fabricated or missing refs). */
export function allSupported(resolutions: readonly EvidenceResolution[]): boolean {
  return resolutions.every((r) => r.supported);
}

/** Filter to only unsupported resolutions for warnings / UI markers. */
export function unsupportedOnly(
  resolutions: readonly EvidenceResolution[],
): Array<Extract<EvidenceResolution, { unsupported: true }>> {
  return resolutions.filter(
    (r): r is Extract<EvidenceResolution, { unsupported: true }> => r.unsupported,
  );
}
