import { fnv1aHex, round2 } from "@forge/capability-sdk";
import type { Cluster, RepresentativeQuote, TicketInput } from "./types";
import { excerptQuote, extractPhrases, tokenize } from "./text";

/** Jaccard similarity threshold for agglomeration. */
export const JACCARD_THRESHOLD = 0.28;

export interface TicketSignature {
  ticket: TicketInput;
  phrases: Set<string>;
  /** phrase -> score (subject hits weighted higher) */
  phraseScores: Map<string, number>;
}

export function buildSignature(ticket: TicketInput): TicketSignature {
  const subjectTokens = tokenize(ticket.subject);
  const bodyTokens = tokenize(ticket.body);
  const tagTokens = ticket.tags.flatMap((t) => tokenize(t));

  const subjectPhrases = extractPhrases(subjectTokens);
  const bodyPhrases = extractPhrases(bodyTokens);
  // Single strong tokens from subject/tags help when bodies are short
  const unigrams = [...subjectTokens, ...tagTokens].filter((t) => t.length >= 4);

  const phraseScores = new Map<string, number>();
  const add = (phrase: string, weight: number) => {
    phraseScores.set(phrase, (phraseScores.get(phrase) ?? 0) + weight);
  };

  for (const p of subjectPhrases) add(p, 3);
  for (const p of bodyPhrases) add(p, 1);
  for (const u of unigrams) add(u, 1.5);

  return {
    ticket,
    phrases: new Set(phraseScores.keys()),
    phraseScores,
  };
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Deterministic union-find agglomeration on sorted ticket ids. */
export function agglomerate(signatures: TicketSignature[], threshold: number): string[][] {
  const ordered = [...signatures].sort((a, b) => a.ticket.id.localeCompare(b.ticket.id));
  const ids = ordered.map((s) => s.ticket.id);
  const parent = ids.map((_, i) => i);

  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root]!;
    let cur = i;
    while (parent[cur] !== cur) {
      const next = parent[cur]!;
      parent[cur] = root;
      cur = next;
    }
    return root;
  };
  const union = (i: number, j: number) => {
    const ri = find(i);
    const rj = find(j);
    if (ri === rj) return;
    // Prefer lower index (sorted id order) as root for stability
    if (ri < rj) parent[rj] = ri;
    else parent[ri] = rj;
  };

  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      const sim = jaccard(ordered[i]!.phrases, ordered[j]!.phrases);
      if (sim >= threshold) {
        union(i, j);
      }
    }
  }

  const groups = new Map<number, string[]>();
  for (let i = 0; i < ordered.length; i++) {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(ordered[i]!.ticket.id);
    groups.set(root, list);
  }

  return [...groups.values()].map((g) => g.sort((a, b) => a.localeCompare(b)));
}

export function clusterIdFor(memberIds: string[]): string {
  const sorted = [...memberIds].sort((a, b) => a.localeCompare(b));
  return `cl_${fnv1aHex(sorted.join("|"))}`;
}

function sharedPhraseScores(members: TicketSignature[]): Map<string, number> {
  const df = new Map<string, number>();
  const scoreSum = new Map<string, number>();
  for (const m of members) {
    for (const [phrase, score] of m.phraseScores) {
      df.set(phrase, (df.get(phrase) ?? 0) + 1);
      scoreSum.set(phrase, (scoreSum.get(phrase) ?? 0) + score);
    }
  }
  const n = members.length;
  const combined = new Map<string, number>();
  for (const [phrase, count] of df) {
    // Prefer phrases shared by more members
    if (count < Math.min(2, n) && n > 1) continue;
    combined.set(phrase, (scoreSum.get(phrase) ?? 0) * (count / n));
  }
  // Fallback: any phrase if nothing shared
  if (combined.size === 0) {
    for (const [phrase, score] of scoreSum) {
      combined.set(phrase, score);
    }
  }
  return combined;
}

function pickLabel(members: TicketSignature[]): string {
  const scores = sharedPhraseScores(members);
  let best = "";
  let bestScore = -1;
  const phrases = [...scores.keys()].sort((a, b) => a.localeCompare(b));
  for (const phrase of phrases) {
    const s = scores.get(phrase) ?? 0;
    if (s > bestScore || (s === bestScore && phrase.localeCompare(best) < 0)) {
      best = phrase;
      bestScore = s;
    }
  }
  return best || "unlabeled cluster";
}

function averagePairwiseJaccard(members: TicketSignature[]): number {
  if (members.length < 2) return 1;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      sum += jaccard(members[i]!.phrases, members[j]!.phrases);
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
}

function quotesFor(members: TicketSignature[]): RepresentativeQuote[] {
  const sorted = [...members].sort((a, b) => a.ticket.id.localeCompare(b.ticket.id));
  return sorted.slice(0, 3).map((m) => ({
    ticketId: m.ticket.id,
    quote: excerptQuote(m.ticket.body || m.ticket.subject),
  }));
}

export function buildCluster(memberIds: string[], byId: Map<string, TicketSignature>): Cluster {
  const members = memberIds
    .map((id) => byId.get(id)!)
    .sort((a, b) => a.ticket.id.localeCompare(b.ticket.id));
  const ticketIds = members.map((m) => m.ticket.id);
  const label = pickLabel(members);
  const confidence = round2(averagePairwiseJaccard(members));
  return {
    clusterId: clusterIdFor(ticketIds),
    label,
    rootCauseHypothesis: `Tickets share the phrase "${label}", suggesting a common failure mode.`,
    ticketIds,
    confidence,
    representativeQuotes: quotesFor(members),
  };
}
