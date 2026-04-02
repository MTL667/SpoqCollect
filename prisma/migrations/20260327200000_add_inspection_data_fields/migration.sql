-- AlterTable: add inspection data and label photo fields to scan_records
ALTER TABLE "scan_records" ADD COLUMN "label_photo_path" TEXT;
ALTER TABLE "scan_records" ADD COLUMN "last_inspection_date" TIMESTAMP(3);
ALTER TABLE "scan_records" ADD COLUMN "certified_until_date" TIMESTAMP(3);
ALTER TABLE "scan_records" ADD COLUMN "lb_lmb_percentage" TEXT;
ALTER TABLE "scan_records" ADD COLUMN "lb_lmb_test_date" TIMESTAMP(3);
ALTER TABLE "scan_records" ADD COLUMN "inspection_comment" TEXT;
ALTER TABLE "scan_records" ADD COLUMN "external_inspection_number" TEXT;
ALTER TABLE "scan_records" ADD COLUMN "label_ai_raw_response" TEXT;
