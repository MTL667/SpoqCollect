-- AlterTable: add export_party field to object_types
ALTER TABLE "object_types" ADD COLUMN "export_party" TEXT NOT NULL DEFAULT 'aceg';

-- Set Simafire party for fire suppression types
UPDATE "object_types" SET "export_party" = 'simafire' WHERE "name_nl" IN ('Brandblussers','Brandhaspels','Hydranten','Dampkapblusinstallatie');

-- Set Firesecure party for fire doors
UPDATE "object_types" SET "export_party" = 'firesecure' WHERE "name_nl" IN ('Brandwerende deur');
