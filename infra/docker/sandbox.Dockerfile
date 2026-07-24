FROM node@sha256:e21fc383b50d5347dc7a9f1cae45b8f4e2f0d39f7ade28e4eef7d2934522b752
ENV NODE_ENV=production
WORKDIR /runner
RUN groupadd -g 10001 forge && useradd -u 10001 -g forge -m forge
COPY --chown=forge:forge infra/sandbox-runner/index.mjs /runner/index.mjs
USER forge
ENTRYPOINT ["node", "/runner/index.mjs"]
