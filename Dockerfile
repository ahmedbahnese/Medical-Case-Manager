# ============================================================
# BSCH — Multi-stage production Docker build
# Stage 1: Build frontend
# Stage 2: Build API server
# Stage 3: Production image
# ============================================================

# ── Stage 1: Frontend build ───────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /workspace

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy library and artifact manifests (needed for workspace linking)
COPY lib/ ./lib/
COPY artifacts/bsch/package.json ./artifacts/bsch/
COPY artifacts/api-server/package.json ./artifacts/api-server/

# Install all deps (needed for workspace packages)
RUN pnpm install --frozen-lockfile

# Copy frontend source
COPY artifacts/bsch/ ./artifacts/bsch/

# Build frontend (outputs to artifacts/bsch/dist/public)
ENV BASE_PATH=/
ENV NODE_ENV=production
RUN pnpm --filter @workspace/bsch run build

# ── Stage 2: API Server build ─────────────────────────────────────────────────
FROM node:22-alpine AS api-builder
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY lib/ ./lib/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/bsch/package.json ./artifacts/bsch/

RUN pnpm install --frozen-lockfile

COPY artifacts/api-server/ ./artifacts/api-server/

RUN pnpm --filter @workspace/api-server run build

# ── Stage 3: Production runtime ───────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy only the built API server artifacts
COPY --from=api-builder /workspace/artifacts/api-server/dist/ ./dist/
COPY --from=api-builder /workspace/node_modules/ ./node_modules/
COPY --from=api-builder /workspace/artifacts/api-server/package.json ./package.json

# Copy built frontend into a public directory the API can serve statically
COPY --from=frontend-builder /workspace/artifacts/bsch/dist/public/ ./public/

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
