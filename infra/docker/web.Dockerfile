FROM node@sha256:e58326d0d441090181ac150dc2078d3e2cf6a0d42e809aebba3ef5880935ffdd AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=forge-pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
COPY . .
RUN --mount=type=cache,id=forge-pnpm,target=/pnpm/store pnpm install --offline --frozen-lockfile
RUN pnpm --filter @forge/web build

FROM node@sha256:e58326d0d441090181ac150dc2078d3e2cf6a0d42e809aebba3ef5880935ffdd AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -S -g 10001 forge && adduser -S -u 10001 -G forge forge
COPY --from=build --chown=forge:forge /app/apps/web/.next/standalone ./
COPY --from=build --chown=forge:forge /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=forge:forge /app/apps/web/public ./apps/web/public
USER forge
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
