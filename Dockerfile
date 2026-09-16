# ── server deps (with native build toolchain for better-sqlite3) ────────────
FROM node:22-slim AS server-deps
WORKDIR /opt/server
COPY server/package*.json ./
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && npm install

# ── build the Vue SPA ───────────────────────────────────────────────────────
FROM node:22-slim AS client-build
WORKDIR /opt/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ── prod: single Node image serving API + static SPA ────────────────────────
FROM node:22-slim AS prod
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    STATIC_DIR=/app/public
COPY --from=server-deps /opt/server/node_modules ./node_modules
COPY server/src ./src
COPY --from=client-build /opt/client/dist ./public
VOLUME /data
EXPOSE 3000
CMD ["node", "src/index.js"]
