-- Add updatedAt column to inventory_sessions, defaulting to created_at for existing rows
ALTER TABLE "inventory_sessions" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "inventory_sessions" SET "updated_at" = "created_at";
