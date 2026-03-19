#!/bin/sh
set -e

echo "=== InventariSpoq startup ==="
echo "DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo 'YES' || echo 'NO')"
echo "NODE_ENV: $NODE_ENV"
echo "Working dir: $(pwd)"
echo "Files in /app:"
ls -la /app/

echo ""
echo "=== Pushing database schema ==="
if [ "$FORCE_DB_RESET" = "true" ]; then
  echo "FORCE_DB_RESET=true → dropping and recreating database"
  npx prisma db push --force-reset 2>&1
else
  npx prisma db push --accept-data-loss 2>&1
fi
echo "=== Schema push complete ==="

echo ""
echo "=== Running seed ==="
npx tsx prisma/seed.ts 2>&1 || echo "WARNING: Seed failed (may already be seeded)"

echo ""
echo "=== Starting server ==="
exec node server/dist/server.js
