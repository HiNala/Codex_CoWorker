# forge/web — Next.js standalone runtime.
# Health: GET /api/health/live (liveness), /api/health/ready (deps).
# Secrets: injected at runtime only (DATABASE_URL, S3_*, SESSION_SECRET, …).
# Never bake credentials into layers.

FROM node@sha256:e58326d0d441090181ac150dc2078d3e2cf6a0d42e809aebba3ef5880935ffdd AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=forge-pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
COPY . .
# public/ may be empty in git; ensure COPY path exists for the runtime stage.
RUN mkdir -p apps/web/public
RUN --mount=type=cache,id=forge-pnpm,target=/pnpm/store pnpm install --offline --frozen-lockfile
# apps/web/next.config.ts sets output: "standalone" + outputFileTracingRoot monorepo root.
RUN pnpm --filter @forge/web build

FROM node@sha256:e58326d0d441090181ac150dc2078d3e2cf6a0d42e809aebba3ef5880935ffdd AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN addgroup -S -g 10001 forge && adduser -S -u 10001 -G forge forge
# Standalone tree already includes traced node_modules; static + public sit beside server.js.
COPY --from=build --chown=forge:forge /app/apps/web/.next/standalone ./
COPY --from=build --chown=forge:forge /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=forge:forge /app/apps/web/public ./apps/web/public
USER forge
EXPOSE 3000
# Railway / compose should probe liveness only — never /ready (avoids restart storms).
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
