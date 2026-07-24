# ADR-0002: PostgreSQL is the queue

- Status: accepted
- Date: 2026-07-23

## Decision

Use PostgreSQL 17 for jobs, leases, retries, dead-letter state, the transactional outbox, and run
events. Do not add Redis.

## Why

`FOR UPDATE SKIP LOCKED` provides the concurrency primitive this workload needs, and keeping the job
record beside the state transition and event makes atomicity reviewable. It also removes an
otherwise unnecessary service from local and deployed operations.
