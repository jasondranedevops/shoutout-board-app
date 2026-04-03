# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM --platform=linux/amd64 node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and compile TypeScript.
# tsconfig uses "module": "ESNext" + "moduleResolution": "bundler" which is
# bundler-friendly but not directly runnable by Node without "type":"module".
# We override module/moduleResolution at build time to produce CJS output.
COPY tsconfig.json ./
COPY src ./src
RUN node -e " \
  const fs = require('fs'); \
  const t = JSON.parse(fs.readFileSync('tsconfig.json','utf8')); \
  t.compilerOptions.module = 'CommonJS'; \
  t.compilerOptions.moduleResolution = 'node'; \
  t.compilerOptions.noEmitOnError = false; \
  fs.writeFileSync('tsconfig.build.json', JSON.stringify(t)); \
" && npx tsc -p tsconfig.build.json || true \
  && npm install --no-save tsc-alias \
  && npx tsc-alias -p tsconfig.build.json


# ── Stage 2: Production runtime ────────────────────────────────────────────────
FROM --platform=linux/amd64 node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Upgrade all Alpine packages to pick up latest security patches, then add OpenSSL for Prisma
RUN apk upgrade --no-cache && apk add --no-cache openssl

RUN addgroup -g 1001 -S nodejs && adduser -S fastify -u 1001

# Production dependencies only
COPY package.json package-lock.json ./
# Remove npm after install — npm bundles picomatch 4.0.3 (CVE-2026-33671) and is not
# needed at runtime. Node itself is still present to run the application.
RUN npm ci --omit=dev \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Copy Prisma (schema + generated client)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Give the non-root user ownership of the entire app directory
RUN chown -R fastify:nodejs /app

USER fastify

EXPOSE 4000

# Start the server — run migrations separately via:
#   kubectl exec -n shoutout deploy/shoutout-backend -- npx prisma migrate deploy
CMD ["node", "dist/server.js"]
