# Story 3.2: Photo Upload & Background Queue

Status: ready-for-dev

## Story (As a / I want / so that)

As an inspector, I want photos uploaded in the background without blocking scanning, so that I can scan rapidly.

## Acceptance Criteria

1. Photo captured → ScanRecord created "pending", photo queued, immediately return to scan state
2. Upload completes → photo at /data/photos/{sessionId}/{scanRecordId}.jpg, ScanJob "pending" created
3. Upload fails → retry with exponential backoff
4. Multiple queued → processed sequentially, inspector never blocked

## Tasks / Subtasks

- [ ] Add multer middleware for multipart upload
- [ ] Configure multer: dest `/data/photos`, size limit ~10MB
- [ ] Implement storage abstraction in `server/src/services/storage.ts`
- [ ] Create POST /api/sessions/:id/scans endpoint (multipart)
- [ ] Create ScanRecord with status "pending" on upload
- [ ] Store photo at /data/photos/{sessionId}/{scanRecordId}.jpg
- [ ] Create ScanJob with status "pending" linked to ScanRecord
- [ ] Implement client-side `use-scan.ts` mutation for upload
- [ ] Implement client-side queue for sequential uploads
- [ ] Add exponential backoff on upload failure
- [ ] Ensure inspector returns to scan state immediately after queueing

## Dev Notes

**Previous Story Context:** Story 3.1 provides camera capture. Session detail and auth exist.

**Architecture Patterns:**
- Photo upload: multer middleware, stored at `/data/photos/{sessionId}/{scanRecordId}.jpg`
- Background queue: PostgreSQL scan_jobs table, polling worker in Express process
- Storage abstraction: `server/src/services/storage.ts` interface for future S3 migration

**Code Patterns:**
- Multer: `multer({ dest: '/data/photos' })`, size limit ~10MB
- API response: `{ data: T }` / `{ error: { code, message } }`
- Naming: snake_case DB, camelCase TS

**Key Files:**
- `server/src/routes/scans.ts` (POST /api/sessions/:id/scans multipart)
- `server/src/middleware/upload.ts` (multer config)
- `server/src/services/storage.ts` (storage abstraction)
- `client/src/features/scan/use-scan.ts` (mutation + queue)

**Dependencies:** multer, @types/multer

**FRs:** FR28. **NFRs:** NFR2.

## Dev Agent Record

- Agent Model Used:
- Debug Log References:
- Completion Notes List:
- File List:
