# Story 4.1: Heli OM Excel Generation

Status: ready-for-dev

## Story (As a / I want / so that)

As a backoffice user, I want to generate a 29-column Heli OM Excel from a completed session, so that I can upload directly to Heli OM without manual data entry.

## Acceptance Criteria (numbered list)

1. Completed session → POST /api/sessions/:id/export/heli-om → .xlsx with exactly 29 columns (FR17)
2. Each row = one scan record. Fields populated from scan+session data (FR18). Empty columns left empty not omitted
3. ID labels: building type code + sequential number per object (FR19)
4. 2,000 records → export <30s (NFR5)
5. Active session → HTTP 400

## Tasks / Subtasks (checkbox list)

- [ ] Add exceljs dependency to server
- [ ] Create `server/src/services/export-heli.ts` with configurable column mapping array
- [ ] Implement Heli OM export logic: map scan records + session data to 29 columns
- [ ] ID label convention: address prefix + category code + sequential number (e.g., "Ringlaan - BB 001")
- [ ] Ensure empty columns are present (not omitted) in output
- [ ] Add POST /api/sessions/:id/export/heli-om route in `server/src/routes/exports.ts`
- [ ] Validate session is completed before export; return HTTP 400 for active session
- [ ] Add auth middleware to export route
- [ ] Performance: verify 2,000 records export in <30s
- [ ] Return .xlsx buffer with correct Content-Type and Content-Disposition headers

## Dev Notes (Previous Story Context, architecture details, code patterns, anti-patterns, deps, file structure, references)

**Previous Story Context:** Epic 3 complete (camera capture, photo upload, AI classification, local persistence). Sessions have scan records with object types. Building types and object types in DB with nameNl + nameFr.

**Architecture:**
- API response: `{ data: T }` / `{ error: { code, message } }`
- Naming: snake_case DB, camelCase TS, PascalCase components, kebab-case files
- Auth middleware on all API routes
- Export routes at `server/src/routes/exports.ts`
- Export services: `server/src/services/export-heli.ts` (Excel), `server/src/services/export-report.ts` (PDF)

**29 Heli OM columns (domain analysis):** Equipment (ID label), Categorie, Omschrijving NL, Omschrijving FR, Klantref, Serial, Product ID, Straat, Huisnummer, Postcode, Stad, Last inspection date, Gekeurd tot datum, LB/LMB %, Commentaar Keuring, Keurder-initialen, Ext. keuringsnummer, and additional domain fields. Create a configurable mapping array — exact column mapping is domain-specific.

**ID label convention:** e.g., "Ringlaan - BB 001" (address prefix + category code + sequential number per object type)

**Dependencies:** exceljs

**Key files:** `server/src/services/export-heli.ts`, `server/src/routes/exports.ts`

**FRs:** FR16, FR17, FR18, FR19. **NFRs:** NFR5.

## Dev Agent Record (empty: Agent Model Used, Debug Log References, Completion Notes List, File List)
