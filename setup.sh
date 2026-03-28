#!/bin/bash
set -e

echo ""
echo "================================================"
echo "  Shoutboard — Dev Environment Setup"
echo "================================================"
echo ""

# ── 1. Start Docker services ──────────────────────
echo "▶ Starting Postgres + Redis..."
docker compose up -d
echo "  Waiting for services to be healthy..."
sleep 5

# ── 2. Install backend deps ───────────────────────
echo ""
echo "▶ Installing backend dependencies..."
cd backend
npm install

# ── 3. Generate Prisma client + run migrations ───
echo ""
echo "▶ Running database migrations..."
npx prisma migrate dev --name init

# ── 4. Seed demo data ─────────────────────────────
echo ""
echo "▶ Seeding demo data..."
npx tsx src/db/seed.ts

cd ..

# ── 5. Install frontend deps ──────────────────────
echo ""
echo "▶ Installing frontend dependencies..."
cd frontend
npm install
cd ..

# ── Done ──────────────────────────────────────────
echo ""
echo "================================================"
echo "  ✅ Setup complete!"
echo "================================================"
echo ""
echo "  To start the dev servers, open two terminals:"
echo ""
echo "  Terminal 1 (API):"
echo "    cd backend && npm run dev"
echo "    → http://localhost:4000"
echo ""
echo "  Terminal 2 (Web):"
echo "    cd frontend && npm run dev"
echo "    → http://localhost:3000"
echo ""
echo "  Demo login:"
echo "    Email:    admin@demo.shoutboard.io"
echo "    Password: demo1234"
echo ""
echo "  API docs (OpenAPI spec):"
echo "    openapi.yaml — import into Postman or Insomnia"
echo ""
