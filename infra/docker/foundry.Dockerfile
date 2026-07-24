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
WORKDIR /app
RUN groupadd -g 10001 forge && useradd -u 10001 -g forge -m forge
COPY --from=build --chown=forge:forge /release ./
USER forge
EXPOSE 3002
CMD ["node", "dist/main.js"]
