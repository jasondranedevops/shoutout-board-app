# ── Stage 1: Dependencies ──────────────────────────────────────────────────────
FROM --platform=linux/amd64 node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json .npmrc* ./
RUN npm ci


# ── Stage 2: Build ─────────────────────────────────────────────────────────────
FROM --platform=linux/amd64 node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_API_URL is baked in at build time via next.config.js env block.
# Pass it here so the built bundle points to the right API host.
ARG NEXT_PUBLIC_API_URL=https://shoutout-api.figtree-development.net
ARG NEXT_PUBLIC_APP_URL=https://shoutout.figtree-development.net

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npm run build


# ── Stage 3: Production runtime ────────────────────────────────────────────────
FROM --platform=linux/amd64 node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Upgrade all Alpine packages to pick up latest security patches.
# Remove npm — it bundles picomatch 4.0.3 (CVE-2026-33671) and is not needed at runtime.
RUN apk upgrade --no-cache \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# next.config.js output: 'standalone' produces a minimal self-contained server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
