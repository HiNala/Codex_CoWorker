# ticket-cluster-analyzer

**Version:** 1.2.0 · **Kind:** skill · **Authored by:** human

Groups support tickets by root cause using deterministic lexical clustering. No embeddings, no network.

## Algorithm

1. Normalize text (NFKC, lowercase), strip punctuation, drop English stopwords.
2. Extract 2–4-gram phrases from subject (weight 3) and body (weight 1); subject/tag unigrams (weight 1.5).
3. Agglomerate tickets whose phrase sets have Jaccard similarity ≥ 0.28.
4. Keep groups with size ≥ `minClusterSize` (default 2).
5. `clusterId` = `cl_` + FNV-1a hex of sorted member ids.
6. Label = highest-scoring shared phrase; confidence = mean pairwise Jaccard (2 dp).

## Input

```ts
{
  tickets: Array<{
    id: string;
    subject: string;
    body: string;
    createdAt: string;
    requesterId: string;
    tags: string[];
  }>;
  minClusterSize?: number; // default 2
}
```

## Output

```ts
{
  clusters: Array<{
    clusterId: string;
    label: string;
    rootCauseHypothesis: string;
    ticketIds: string[]; // sorted
    confidence: number;  // 0–1, two decimals
    representativeQuotes: Array<{ ticketId: string; quote: string }>; // max 3
  }>;
  unclustered: string[];
  summary: { totalTickets: number; clusteredTickets: number; clusterCount: number };
}
```

## Limitations

- Lexical only — paraphrases without shared n-grams may not cluster.
- English stopword list.
- Deterministic but threshold-sensitive; very short tickets may under-cluster.

## Invariants

- Pure function over JSON; same input → byte-identical `JSON.stringify` output.
- Time only via `ctx.now()` (unused here).
- Zero runtime dependencies.
  }
