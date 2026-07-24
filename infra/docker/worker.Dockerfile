# forge/worker — job runner + orchestrator.
# Health endpoints (HTTP on WORKER_HEALTH_PORT, default 3001):
#   GET /health/live   — process up
#   GET /health/ready  — DB + object store reachable
# Secrets: DATABASE_URL, S3_*, provider keys injected at runtime only.
# Never bake credentials into layers. Do not ship RAILWAY_* tokens to web.

FROM node@sha256:e58326d0d441090181ac150dc2078d3e2cf6a0d42e809aebba3ef5880935ffdd AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=forge-pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
COPY . .
RUN --mount=type=cache,id=forge-pnpm,target=/pnpm/store pnpm install --offline --frozen-lockfile
RUN pnpm --filter @forge/worker build
RUN pnpm --filter @forge/worker deploy --prod --legacy /release

FROM node@sha256:e58326d0d441090181ac150dc2078d3e2cf6a0d42e809aebba3ef5880935ffdd AS runtime
ENV NODE_ENV=production
ENV WORKER_HEALTH_PORT=3001
WORKDIR /app
RUN addgroup -S -g 10001 forge && adduser -S -u 10001 -G forge forge
COPY --from=build --chown=forge:forge /release ./
USER forge
EXPOSE 3001
# Probe liveness only. Readiness depends on Postgres/MinIO and must not restart the process.
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.WORKER_HEALTH_PORT||3001)+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
