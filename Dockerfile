# ============================================================
# BSCH — Multi-stage production Docker build
# Stage 1: Build frontend (React + Vite)
# Stage 2: Build API server (Express + esbuild)
# Stage 3: Minimal production runtime image
# ============================================================

# ── Stage 1: Frontend build ───────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests first (layer cache)
COPY pnpm-workspace.yaml ./
COPY package.json ./

# Copy all lib and artifact package manifests for workspace linking
COPY lib/ ./lib/
COPY artifacts/bsch/package.json ./artifacts/bsch/
COPY artifacts/api-server/package.json ./artifacts/api-server/

# Install all workspace dependencies
RUN pnpm install

# Copy frontend source
COPY artifacts/bsch/ ./artifacts/bsch/

# Build frontend → artifacts/bsch/dist/public/
ENV BASE_PATH=/
ENV NODE_ENV=production
RUN pnpm --filter @workspace/bsch run build

# ── Stage 2: API Server build ─────────────────────────────────────────────────
FROM node:22-alpine AS api-builder
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY lib/ ./lib/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/bsch/package.json ./artifacts/bsch/

RUN pnpm install

COPY artifacts/api-server/ ./artifacts/api-server/

# Build API server → artifacts/api-server/dist/index.mjs (self-contained bundle)
RUN pnpm --filter @workspace/api-server run build

# ── Stage 3: Production runtime ───────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# Copy the self-contained API bundle (no node_modules needed — esbuild bundles all deps)
COPY --from=api-builder /workspace/artifacts/api-server/dist/ ./dist/

# Copy built frontend static files (served by the API's static middleware)
COPY --from=frontend-builder /workspace/artifacts/bsch/dist/public/ ./public/

# Non-root user for security
RUN addgroup -S bsch && adduser -S bsch -G bsch
USER bsch

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/healthz || exit 1

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
