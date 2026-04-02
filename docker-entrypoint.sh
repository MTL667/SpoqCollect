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
  OUTPUT=$(npx prisma migrate deploy 2>&1) && echo "$OUTPUT" || {
    echo "$OUTPUT"
    if echo "$OUTPUT" | grep -q "P3005"; then
      echo ""
      echo "=== P3005: Database has tables but no migration history ==="
      echo "Baselining pre-existing migrations (created before migrate deploy was enabled)..."

      # These are the migrations that correspond to the schema already applied via db push.
      # New migrations added after this baseline will be applied normally by migrate deploy.
      BASELINE_MIGRATIONS="
        20260325120000_epic6_epic7_prompts_odoo
        20260325140000_prior_reports_draft_assets
        20260327120000_add_odoo_products_and_start_price
        20260327150000_add_custom_object_types
        20260327160000_add_export_party
        20260327170000_add_mapping_rule_fields
        20260327180000_add_subasset_types
        20260327190000_add_mapping_profiles
        20260327200000_add_inspection_data_fields
      "

      for migration_name in $BASELINE_MIGRATIONS; do
        echo "  Resolving as applied: $migration_name"
        npx prisma migrate resolve --applied "$migration_name" 2>&1 || true
      done

      echo ""
      echo "=== Retrying migrate deploy (will apply remaining new migrations) ==="
      npx prisma migrate deploy 2>&1
    else
      echo "Migration failed with unexpected error"
      exit 1
    fi
  }
fi
echo "=== Migrations complete ==="

echo ""
echo "=== Running seed ==="
npx tsx prisma/seed.ts 2>&1 || echo "WARNING: Seed failed (may already be seeded)"

echo ""
echo "=== Starting server ==="
exec node server/dist/server.js
