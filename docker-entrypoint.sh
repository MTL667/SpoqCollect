#!/bin/sh
set -e

echo "Pushing database schema..."
npx prisma db push --skip-generate --accept-data-loss 2>&1 || echo "Warning: schema push failed"

echo "Starting server..."
exec node server/dist/server.js
