# forge/sandbox-runner — executes model-authored capability code (Track B).
# Security posture:
#   - uid/gid 10001 only; no root at runtime
#   - no package manager, no git, no shell tooling beyond the base Node image
#   - no secrets: runner strips process.env before loading the capability
#   - no inbound HTTP service → no HEALTHCHECK (batch ENTRYPOINT, not a daemon)
# Compose profile "sandbox" runs with network_mode:none, read_only, cap_drop:ALL.
# Every extra byte is attack surface — keep this image minimal.

FROM node@sha256:e21fc383b50d5347dc7a9f1cae45b8f4e2f0d39f7ade28e4eef7d2934522b752
ENV NODE_ENV=production
WORKDIR /runner
RUN groupadd -g 10001 forge && useradd -u 10001 -g forge -m forge
COPY --chown=forge:forge infra/sandbox-runner/index.mjs /runner/index.mjs
USER forge
ENTRYPOINT ["node", "/runner/index.mjs"]
