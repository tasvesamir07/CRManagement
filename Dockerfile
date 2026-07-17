ARG NODE_VERSION=20-alpine

# ============================================================
# Stage 1: Install server production dependencies
# ============================================================
FROM node:${NODE_VERSION} AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production --ignore-scripts --no-audit --no-fund && \
    npm cache clean --force

# ============================================================
# Stage 2: Build client static assets
# ============================================================
FROM node:${NODE_VERSION} AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ============================================================
# Stage 3: Production image
# ============================================================
FROM node:${NODE_VERSION} AS production

# Use tini for proper signal handling (PID 1)
RUN apk add --no-cache tini

WORKDIR /app

# Copy server code + production deps
COPY server/ ./server/
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# Copy built client assets
COPY --from=client-build /app/client/dist ./client/dist

# Create uploads directory for local file fallback
RUN mkdir -p /app/uploads && \
    addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

ENV NODE_ENV=production \
    NODE_OPTIONS="--enable-source-maps" \
    LOG_LEVEL=info

# Health check — verifies the API is responsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

WORKDIR /app/server

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
