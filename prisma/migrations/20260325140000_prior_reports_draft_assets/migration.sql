-- Prior reports (PDF) + draft assets from previous inspection reports
CREATE TABLE "prior_report_files" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "stored_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL DEFAULT 'application/pdf',
    "extraction_status" TEXT NOT NULL DEFAULT 'pending',
    "extraction_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prior_report_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "draft_assets" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "prior_report_file_id" TEXT,
    "title" TEXT NOT NULL,
    "last_inspection_date" TIMESTAMP(3),
    "location_hint" TEXT,
    "suggested_object_type_id" TEXT,
    "raw_extraction" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "matched_scan_id" TEXT,

    CONSTRAINT "draft_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "draft_assets_matched_scan_id_key" ON "draft_assets"("matched_scan_id");

CREATE INDEX "draft_assets_session_id_idx" ON "draft_assets"("session_id");

CREATE INDEX "draft_assets_status_idx" ON "draft_assets"("status");

ALTER TABLE "prior_report_files" ADD CONSTRAINT "prior_report_files_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "inventory_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "draft_assets" ADD CONSTRAINT "draft_assets_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "inventory_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "draft_assets" ADD CONSTRAINT "draft_assets_prior_report_file_id_fkey" FOREIGN KEY ("prior_report_file_id") REFERENCES "prior_report_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "draft_assets" ADD CONSTRAINT "draft_assets_suggested_object_type_id_fkey" FOREIGN KEY ("suggested_object_type_id") REFERENCES "object_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "draft_assets" ADD CONSTRAINT "draft_assets_matched_scan_id_fkey" FOREIGN KEY ("matched_scan_id") REFERENCES "scan_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
