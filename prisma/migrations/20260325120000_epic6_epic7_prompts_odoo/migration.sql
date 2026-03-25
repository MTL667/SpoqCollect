-- Epic 6/7: session prompts, scan hierarchy, Odoo service code mappings
ALTER TABLE "inventory_sessions" ADD COLUMN IF NOT EXISTS "session_prompt_data" JSONB;
ALTER TABLE "inventory_sessions" ADD COLUMN IF NOT EXISTS "mapping_version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "scan_records" ADD COLUMN IF NOT EXISTS "parent_scan_id" TEXT;
ALTER TABLE "scan_records" ADD COLUMN IF NOT EXISTS "on_scan_prompt_answers" JSONB;

CREATE TABLE IF NOT EXISTS "service_code_mappings" (
    "id" TEXT NOT NULL,
    "object_type_id" TEXT NOT NULL,
    "regime" TEXT,
    "odoo_product_code" TEXT NOT NULL,
    "label_nl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "service_code_mappings_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
 ALTER TABLE "service_code_mappings" ADD CONSTRAINT "service_code_mappings_object_type_id_fkey"
   FOREIGN KEY ("object_type_id") REFERENCES "object_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "scan_records" ADD CONSTRAINT "scan_records_parent_scan_id_fkey"
   FOREIGN KEY ("parent_scan_id") REFERENCES "scan_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "scan_records_parent_scan_id_idx" ON "scan_records"("parent_scan_id");
