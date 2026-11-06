# ==============================================================================
# MedStock ERP — Production Multi-Stage Dockerfile (ARM64 / x86_64)
# ==============================================================================

# --- Stage 1: Build & Dependencies ---
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies for native Node addons
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install npm dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source code
COPY . .

# Build production SvelteKit standalone Node server (build/index.js)
RUN npm run build

# --- Stage 2: Production Runner ---
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Install runtime tools: postgresql-client (provides pg_dump for backup engine)
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy node_modules and built output from builder stage
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/lib/server/db ./src/lib/server/db
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create backup directory with write permissions
RUN mkdir -p /app/backups

EXPOSE 3000

# Health check against SvelteKit health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "build/index.js"]
