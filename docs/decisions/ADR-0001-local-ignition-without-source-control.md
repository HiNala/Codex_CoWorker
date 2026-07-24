# ADR-0001: local ignition without source-control operations

- Status: accepted
- Date: 2026-07-23

## Context

The mission pack assumes a Git-based parallel build. The workspace owner explicitly requested no Git
or GitHub operations during foundation work.

## Decision

Create the same monorepo seams, verification commands, changelog structure, and service boundaries,
but do not initialize a repository, inspect Git state, create commits, configure remotes, or create
GitHub resources. The Next.js generator was invoked with `--disable-git`.

## Consequence

The local architecture is ready for rapid implementation, but source-control and hosted CI remain a
separate, explicitly authorized future step.
