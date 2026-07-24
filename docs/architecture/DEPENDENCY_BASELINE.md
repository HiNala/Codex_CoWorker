# Dependency baseline

Recorded 2026-07-23 during local ignition.

| Dependency         |                  Version | Decision                                                                                                                          |
| ------------------ | -----------------------: | --------------------------------------------------------------------------------------------------------------------------------- |
| Node.js            |          22.22.3 minimum | Composio's ESM SDK requires this floor. The host currently runs 22.12.0; containers and CI must use the minimum or newer Node 22. |
| pnpm               |                  10.14.0 | Workspace package manager, pinned in `packageManager`.                                                                            |
| Next.js            |                  16.2.11 | Current stable line from the npm `latest` tag. No canary or preview.                                                              |
| React              |                   19.2.4 | Version selected by the official Next.js generator.                                                                               |
| TypeScript         |                    5.9.3 | Current stable 5.x line; TypeScript 7 is not adopted during ignition.                                                             |
| PostgreSQL         |                       17 | Durable application state, event store, outbox, and job queue.                                                                    |
| Drizzle ORM        |                   0.45.2 | Schema and application queries. SQL migrations are committed artifacts.                                                           |
| PostgreSQL image   | `sha256:742f40ea…252193` | Digest-pinned PostgreSQL 17 Alpine image.                                                                                         |
| MinIO server image | `sha256:14cea493…d8936e` | Local S3-compatible storage behind `ObjectStore`.                                                                                 |
| MinIO client image | `sha256:a7fe349e…f11727` | One-shot private bucket provisioning.                                                                                             |
| Node Alpine image  | `sha256:e58326d0…35ffdd` | Web and worker build/runtime base, Node 22.22.3.                                                                                  |
| Node slim image    | `sha256:e21fc383…22b752` | Foundry and sandbox base, Node 22.22.3.                                                                                           |
| Zod                |                    4.4.3 | Runtime validation and derived TypeScript types.                                                                                  |
| Vitest             |                   4.1.10 | Unit and integration test runner.                                                                                                 |
| Playwright         |                   1.61.1 | Browser smoke and golden-path tests.                                                                                              |
| Codex CLI          |          0.144.6 on host | The foundry image pins its own explicit version before live use.                                                                  |

The official scaffold command was run once from the empty `apps/web` directory:

```text
pnpm create next-app@16.2.11 . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --disable-git --yes --empty
```
