# ADR-0003: MinIO for local object storage

- Status: accepted for development; production review required
- Date: 2026-07-23

## Decision

Use a digest-pinned MinIO server and a private `forge` bucket for local S3-compatible object storage.
All application access goes through the `ObjectStore` port. The administration console is bound for
local development only and must not be publicly exposed in a deployed environment.

## Production condition

Review MinIO Community Edition licensing, distribution, security updates, and support before
commercial deployment. Railway Buckets is the documented S3-compatible fallback; changing backends
must require environment changes only, not application changes.

The ignition digests are:

- server: `minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e`
- client: `minio/mc@sha256:a7fe349ef4bd8521fb8497f55c6042871b2ae640607cf99d9bede5e9bdf11727`
