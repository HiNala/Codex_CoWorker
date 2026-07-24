# Local development

## First start

1. Use Node 22.22.3 or newer and pnpm 10.14.0.
2. Run `pnpm install --frozen-lockfile`.
3. Run `pnpm dev:infra`.
4. Run `pnpm db:migrate && pnpm db:seed`.
5. Run `pnpm storage:verify`.
6. Run `pnpm dev`.

The services listen on:

| Service       | Address                             | Purpose                            |
| ------------- | ----------------------------------- | ---------------------------------- |
| web           | `http://127.0.0.1:3100`             | Next.js UI, public API, and health |
| worker health | `http://127.0.0.1:3001/health/live` | Job runner liveness                |
| foundry       | `http://127.0.0.1:3002/health/live` | Internal capability-build service  |
| MinIO S3      | `http://127.0.0.1:9000`             | Private object API                 |
| MinIO console | `http://127.0.0.1:9001`             | Local administration only          |

`pnpm infra:down` stops local dependencies without deleting their named volumes. Database and object
data survive restarts.

## Honest degradation

Provider adapters default to deterministic fakes. Set one `ADAPTER_*=live` only after its
service-specific credential is present. Missing live credentials must surface as `not_configured`;
they must never be replaced with fabricated provider success.
