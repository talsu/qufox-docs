# syntax=docker/dockerfile:1

# Debian slim (glibc), not Alpine: the Pagefind search binary is a glibc build
# and does not run on musl.
FROM node:24-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsdown.config.ts ./
COPY src ./src
RUN pnpm build && pnpm prune --prod

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    QUFOX_HOST=0.0.0.0
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Content is mounted here; the "node" user (uid 1000) runs the server.
RUN mkdir -p /content && chown node:node /content
USER node
VOLUME ["/content"]
EXPOSE 4880

ENTRYPOINT ["node", "/app/dist/cli.js"]
CMD ["serve", "/content"]
