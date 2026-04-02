-- AlterTable: add rule-based mapping fields to service_code_mappings
ALTER TABLE "service_code_mappings" ADD COLUMN "region" TEXT;
ALTER TABLE "service_code_mappings" ADD COLUMN "min_quantity" INTEGER;
ALTER TABLE "service_code_mappings" ADD COLUMN "max_quantity" INTEGER;
ALTER TABLE "service_code_mappings" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;
