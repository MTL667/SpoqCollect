-- AlterTable: add custom object type fields
ALTER TABLE "object_types" ADD COLUMN "is_custom" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "object_types" ADD COLUMN "client_name" TEXT;

-- Drop existing unique index on name_nl
DROP INDEX IF EXISTS "object_types_name_nl_key";

-- Create compound unique index on (name_nl, client_name)
CREATE UNIQUE INDEX "object_types_name_nl_client_name_key" ON "object_types"("name_nl", "client_name");
