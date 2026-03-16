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
npx prisma db push --accept-data-loss 2>&1
echo "=== Schema push complete ==="

echo ""
echo "=== Starting server ==="
exec node server/dist/server.js
