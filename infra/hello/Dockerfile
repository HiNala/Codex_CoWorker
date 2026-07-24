# Build context: monorepo root (Railway RAILWAY_DOCKERFILE_PATH=infra/hello/Dockerfile)
FROM node:22-alpine@sha256:e58326d0d441090181ac150dc2078d3e2cf6a0d42e809aebba3ef5880935ffdd
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN addgroup -S -g 10001 forge && adduser -S -u 10001 -G forge forge
COPY --chown=forge:forge infra/hello/server.mjs ./server.mjs
USER forge
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
