# Contributing

## Branches

- Branch from `main`: `fix/<short-description>` or `forge/<short-description>`.
- Automated fixes from the FORGE coworker use `forge/fix-<slug>-{shortId}`.

## Pull requests

- Prefer small PRs with tests for pricing and checkout paths.
- **PR title** should state the customer-visible outcome (e.g. "Fix annual checkout returning a generic 500").
- **PR body** should cover: problem, impact (who/how many if known), changes, verification, and what was not addressed.
- Do not merge without green `npm test`.

## Local checks

```bash
npm test
npm run verify:logs
```

`verify:logs` asserts the checkout error sample fixture (distinct customers and attempt counts).
