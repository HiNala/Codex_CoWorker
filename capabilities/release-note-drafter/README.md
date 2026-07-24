# release-note-drafter

**Version:** 1.0.0 · **Kind:** skill · **Authored by:** codex

Drafts release notes from conventional commits. Lives in the toolbelt to prove the library is not bespoke to one demo story.

## Behavior

- Parses `type(scope)!: subject` conventional commits.
- Groups into `breaking` | `features` | `fixes` | `internal`.
- `feat!` / `BREAKING CHANGE` footers → breaking.
- Fallback heuristics for non-conventional messages.
- **Customer audience** strips `internal` items and rewrites subjects into full sentences.
- **Internal audience** keeps all groups with `type(scope): subject (sha)`.

## Input

```ts
{
  commits: Array<{ sha: string; message: string; author: string; files: string[] }>;
  previousTag: string;
  newTag: string;
  audience: "internal" | "customer";
}
```

## Output

```ts
{
  markdown: string;
  grouped: Record<"breaking" | "features" | "fixes" | "internal", string[]>;
  breakingChangeCount: number;
}
```
