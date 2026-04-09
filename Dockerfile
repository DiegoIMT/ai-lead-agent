# ── Build Stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Create data directory
RUN mkdir -p data

# ── Runtime ─────────────────────────────────────────────────────────────────────
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV WEBHOOK_INTERNAL_ENABLED=true

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
