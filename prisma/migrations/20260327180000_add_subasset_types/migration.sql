-- AlterTable: add parent_object_type_id for sub-asset hierarchy
ALTER TABLE "object_types" ADD COLUMN "parent_object_type_id" TEXT;

-- AddForeignKey
ALTER TABLE "object_types" ADD CONSTRAINT "object_types_parent_object_type_id_fkey"
  FOREIGN KEY ("parent_object_type_id") REFERENCES "object_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
