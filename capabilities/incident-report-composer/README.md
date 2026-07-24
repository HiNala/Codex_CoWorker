# incident-report-composer

**Version:** 2.0.0 · **Kind:** skill · **Authored by:** codex

Turns clusters, impact rows, evidence, and a timeline into a markdown incident report with real citation anchors.

## Sections

1. Summary  
2. Impact  
3. Timeline  
4. Root cause  
5. Evidence  
6. Recommended actions  
7. Open questions  

## Citations

Inline markers use the form `[^e1]`, `[^e2]`, … mapped to `citations[]`:

```ts
{ anchorId: "e1", evidenceId: "<real evidence id>", claim: "..." }
```

**Never fabricates a citation.** If a claim has no supporting evidence record, the claim is marked `**[unsupported]**` and a warning is recorded.

## Safety

User-supplied strings are HTML-escaped (`<`, `>`, `&`, quotes). No raw HTML is emitted intentionally.

## Input / Output

See Track C §4. Optional `changeSummary` is woven into Summary and Recommended actions.

## Limitations

- Template recommended actions, not LLM prose.
- Evidence matching prefers id equality / substring of ticket id, else first evidence.
}
