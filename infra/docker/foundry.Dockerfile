# forge/foundry — capability build service (Track B owns build assumptions).
# Health endpoints (HTTP on FOUNDRY_PORT, default 3002):
#   GET /health/live   — process up
#   GET /health/ready  — adapter/credential posture (no secret values)
# Secret boundary: CODEX_API_KEY only, injected per invocation at runtime.
# Never DATABASE_URL, S3_*, SESSION_SECRET, or Railway tokens in this image.
# Verify: docker history forge/foundry --no-trunc | grep -iE 'sk-|api[_-]?key' must be empty.

FROM node@sha256:e21fc383b50d5347dc7a9f1cae45b8f4e2f0d39f7ade28e4eef7d2934522b752 AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=forge-pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
COPY . .
RUN --mount=type=cache,id=forge-pnpm,target=/pnpm/store pnpm install --offline --frozen-lockfile
RUN pnpm --filter @forge/foundry build
RUN pnpm --filter @forge/foundry deploy --prod --legacy /release

FROM node@sha256:e21fc383b50d5347dc7a9f1cae45b8f4e2f0d39f7ade28e4eef7d2934522b752 AS runtime
ENV NODE_ENV=production
ENV FOUNDRY_PORT=3002
WORKDIR /app
RUN groupadd -g 10001 forge && useradd -u 10001 -g forge -m forge
COPY --from=build --chown=forge:forge /release ./
USER forge
EXPOSE 3002
# Liveness only — readiness may report not_configured for live Codex without restarting.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.FOUNDRY_PORT||3002)+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
