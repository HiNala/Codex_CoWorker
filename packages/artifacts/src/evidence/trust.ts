import type { EvidenceTrust } from "./types";

/**
 * Higher rank = stronger trust. Ranking is fixed; never invent intermediate levels.
 * official > secondary > user_supplied > untrusted
 */
export const TRUST_RANK: Readonly<Record<EvidenceTrust, number>> = {
  official: 4,
  secondary: 3,
  user_supplied: 2,
  untrusted: 1,
} as const;

const RANK_TO_TRUST: ReadonlyArray<EvidenceTrust> = [
  "untrusted",
  "user_supplied",
  "secondary",
  "official",
];

export function trustRank(trust: EvidenceTrust): number {
  return TRUST_RANK[trust];
}

/**
 * Returns the weaker of two trust levels.
 * Trust may only stay the same or degrade — never upgrade.
 */
export function weakerTrust(a: EvidenceTrust, b: EvidenceTrust): EvidenceTrust {
  return trustRank(a) <= trustRank(b) ? a : b;
}

/**
 * Aggregate trust over a set of records by taking the minimum rank.
 * Empty input is treated as untrusted (honest degradation).
 */
export function aggregateTrust(trusts: readonly EvidenceTrust[]): EvidenceTrust {
  if (trusts.length === 0) return "untrusted";
  let min = TRUST_RANK[trusts[0]!];
  let chosen: EvidenceTrust = trusts[0]!;
  for (let i = 1; i < trusts.length; i++) {
    const t = trusts[i]!;
    const r = TRUST_RANK[t];
    if (r < min) {
      min = r;
      chosen = t;
    }
  }
  return chosen;
}

/**
 * Clamp a proposed trust so it never exceeds an established ceiling.
 * Used when re-attaching or summarizing evidence: proposed ≤ ceiling.
 */
export function clampTrust(proposed: EvidenceTrust, ceiling: EvidenceTrust): EvidenceTrust {
  return weakerTrust(proposed, ceiling);
}

/**
 * True when `next` is strictly stronger than `current` (an illegal upgrade).
 */
export function isTrustUpgrade(current: EvidenceTrust, next: EvidenceTrust): boolean {
  return trustRank(next) > trustRank(current);
}

/**
 * Apply a trust transition. Illegal upgrades return the current trust unchanged.
 */
export function applyTrustTransition(current: EvidenceTrust, next: EvidenceTrust): EvidenceTrust {
  if (isTrustUpgrade(current, next)) return current;
  return next;
}

/** Ordered from weakest to strongest for UI sort / filters. */
export function trustLevelsWeakestFirst(): readonly EvidenceTrust[] {
  return RANK_TO_TRUST;
}

/** Ordered from strongest to weakest. */
export function trustLevelsStrongestFirst(): readonly EvidenceTrust[] {
  return [...RANK_TO_TRUST].reverse();
}
