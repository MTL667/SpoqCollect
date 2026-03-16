# Story 5.1: Client Report PDF Generation

Status: ready-for-dev

## Story (As a / I want / so that)

As a backoffice user, I want to generate a bilingual client report with photos per object, so that I can provide clients with a professional inspection document.

## Acceptance Criteria (numbered list)

1. Completed session → POST /api/sessions/:id/export/client-report → PDF download (FR20)
2. Contains session metadata: address, building type, date, inspector (FR23). Headings in Dutch+French (FR21)
3. Each object: photo + type name NL + type name FR (FR22). Grouped/ordered logically
4. 2,000 records → <30s (NFR5). Photos resized for manageable file size
5. Active session → HTTP 400

## Tasks / Subtasks (checkbox list)

- [ ] Add @react-pdf/renderer dependency to server
- [ ] Create `server/src/services/export-report.ts` with PDF generation logic
- [ ] Create ClientReport React component for @react-pdf/renderer (header + scan records)
- [ ] Header: session metadata (address, building type, date, inspector) in Dutch+French
- [ ] Each scan record: embedded photo (from /data/photos/{sessionId}/{scanRecordId}.jpg) + object type nameNl + nameFr
- [ ] Group/order scan records logically
- [ ] Read photos from filesystem; resize/compress for manageable PDF size (2000-object sessions)
- [ ] Use renderToBuffer: `const pdfBuffer = await renderToBuffer(<ClientReport session={session} scans={scans} />);`
- [ ] Add POST /api/sessions/:id/export/client-report route in `server/src/routes/exports.ts`
- [ ] Validate session is completed; return HTTP 400 for active session
- [ ] Add auth middleware to export route
- [ ] Performance: verify 2,000 records export in <30s
- [ ] Return PDF buffer with correct Content-Type and Content-Disposition headers

## Dev Notes (Previous Story Context, architecture details, code patterns, anti-patterns, deps, file structure, references)

**Previous Story Context:** Epic 3 complete. Photos stored at `/data/photos/{sessionId}/{scanRecordId}.jpg`. Object types have nameNl + nameFr in DB. Bilingual requirement: client report must be Dutch+French.

**Architecture:**
- API response: `{ data: T }` / `{ error: { code, message } }`
- Naming: snake_case DB, camelCase TS, PascalCase components, kebab-case files
- Auth middleware on all API routes
- Export routes at `server/src/routes/exports.ts`
- Export services: `server/src/services/export-report.ts` (PDF)

**PDF generation pattern:**
```typescript
import { renderToBuffer } from '@react-pdf/renderer';
const pdfBuffer = await renderToBuffer(<ClientReport session={session} scans={scans} />);
```

**Report structure:** Header with metadata (NL+FR), then each scan record with embedded photo (read from /data/photos/), object type names in both languages. Photos must be read from filesystem and embedded. Consider resizing/compressing to keep PDF size reasonable for 2000-object sessions.

**Key files:** `server/src/services/export-report.ts`, `server/src/routes/exports.ts` (add endpoint)

**Dependencies:** @react-pdf/renderer

**FRs:** FR20, FR21, FR22, FR23. **NFRs:** NFR5.

## Dev Agent Record (empty: Agent Model Used, Debug Log References, Completion Notes List, File List)
