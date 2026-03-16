# Story 4.2: Export Download UI

Status: ready-for-dev

## Story (As a / I want / so that)

As a backoffice user, I want to trigger and download the Heli OM export from the session detail page, so that I can access the export easily.

## Acceptance Criteria (numbered list)

1. Completed session → "Download Heli OM Excel" button visible
2. Tap → loading indicator, button disabled
3. Complete → auto-download .xlsx, filename: heli-om-{address}-{date}.xlsx
4. Fail → error message + retry
5. Active session → no export buttons

## Tasks / Subtasks (checkbox list)

- [ ] Create `client/src/features/export/ExportView.tsx` (rendered within session detail for completed sessions)
- [ ] Create `client/src/features/export/use-export.ts` hook for export mutation
- [ ] Add "Download Heli OM Excel" button (visible only for completed sessions)
- [ ] Implement loading state: indicator + disabled button during export
- [ ] On success: trigger browser download via blob URL, filename heli-om-{address}-{date}.xlsx
- [ ] On error: display error message with retry option
- [ ] Integrate ExportView into session detail page (completed sessions only)
- [ ] Use TanStack Query mutation for POST /api/sessions/:id/export/heli-om
- [ ] Ensure no export buttons shown for active sessions

## Dev Notes (Previous Story Context, architecture details, code patterns, anti-patterns, deps, file structure, references)

**Previous Story Context:** Story 4.1 provides POST /api/sessions/:id/export/heli-om endpoint returning .xlsx. Epic 2 has session detail page with virtualized scans.

**Architecture:**
- TanStack Query for all server state
- Naming: camelCase TS, PascalCase components, kebab-case files
- Export view is rendered within the session detail page for completed sessions
- Will also host the client report button (Story 5.2)

**File download:** Use browser blob URL (createObjectURL) — no new dependencies.

**Key files:** `client/src/features/export/ExportView.tsx`, `client/src/features/export/use-export.ts`

**FRs:** FR16.

**Dependencies:** none new

## Dev Agent Record (empty: Agent Model Used, Debug Log References, Completion Notes List, File List)
