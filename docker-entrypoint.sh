#!/bin/sh
set -e

echo "=== InventariSpoq startup ==="
echo "DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo 'YES' || echo 'NO')"
echo "NODE_ENV: $NODE_ENV"
echo "Working dir: $(pwd)"

echo ""
echo "=== Applying database migrations ==="
if [ "$FORCE_DB_RESET" = "true" ]; then
  echo "FORCE_DB_RESET=true → resetting database and re-applying all migrations"
  npx prisma migrate reset --force 2>&1
else
  npx prisma migrate deploy 2>&1
fi
echo "=== Migrations complete ==="

echo ""
echo "=== Running seed ==="
npx tsx prisma/seed.ts 2>&1 || echo "WARNING: Seed failed (may already be seeded)"

echo ""
echo "=== Starting server ==="
exec node server/dist/server.js
