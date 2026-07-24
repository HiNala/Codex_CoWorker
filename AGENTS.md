# FORGE — local build operating rules

1. Read `docs/forge-mission-pack/01-PROTOCOL-parallel-execution-and-changelog.md` and
   `02-CONTRACTS-frozen-interfaces.md` before changing application code.
2. Do not run Git commands, create commits, configure remotes, or create GitHub resources in this
   workspace unless the user explicitly reverses that instruction.
3. Treat `packages/contracts` and `packages/db/src/schema` as frozen after ignition.
4. Build against deterministic fakes before enabling a live adapter.
5. Keep credentials out of browser bundles, logs, generated code, and model context.
6. Every external write must execute the exact payload approved by the user.
7. Prefer files under 500 lines and never exceed 1,500 lines of hand-written application code.
8. Run the narrowest relevant verification command, then `pnpm verify` before handoff.
9. No timer or random value may be the source of truth for visible progress.
10. Missing integrations degrade honestly to `not_configured` or `disconnected`.
