# Rollback

## Local containers

Stop application containers while preserving data:

```text
docker compose stop web worker foundry
```

Rebuild the previous known image tags, then start those services. Do not remove `pgdata` or
`miniodata` during an application rollback.

## Database

Migrations are forward-only. The migration runner uses PostgreSQL advisory lock `918273645`, so only
one process can migrate at a time. Restore from a tested backup rather than running a down migration.

## Hosted services

Railway deployment and rollback remain intentionally unconfigured in this local-only pass. Resolve
the exact project, environment, service, and last-known-good deployment ID before any future Railway
mutation.
