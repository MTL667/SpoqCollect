# Story 5.2: Report Download UI

Status: ready-for-dev

## Story (As a / I want / so that)

As a backoffice user, I want to trigger and download the client report from the session detail page, so that I can easily share the report with the client.

## Acceptance Criteria (numbered list)

1. Completed session → "Download Client Report" button alongside Heli OM button
2. Tap → loading indicator, button disabled
3. Complete → auto-download PDF, filename: rapport-{address}-{date}.pdf
4. Fail → error message + retry

## Tasks / Subtasks (checkbox list)

- [ ] Add "Download Client Report" button to `client/src/features/export/ExportView.tsx` (alongside existing Heli OM button)
- [ ] Add report mutation to `client/src/features/export/use-export.ts` (POST /api/sessions/:id/export/client-report)
- [ ] Implement loading state for report: indicator + disabled button during export
- [ ] On success: trigger browser download via blob URL, filename rapport-{address}-{date}.pdf
- [ ] On error: display error message with retry option
- [ ] Both buttons share same loading/error UX patterns (consider shared state or separate mutations)

## Dev Notes (Previous Story Context, architecture details, code patterns, anti-patterns, deps, file structure, references)

**Previous Story Context:** Story 4.2 created ExportView with Heli OM button. Story 5.1 provides POST /api/sessions/:id/export/client-report endpoint returning PDF.

**Architecture:**
- TanStack Query for all server state
- ExportView now offers both exports (Heli OM Excel + Client Report PDF)
- Export buttons live in session detail for completed sessions — NOT a separate page

**Key files:** `client/src/features/export/ExportView.tsx` (extend), `client/src/features/export/use-export.ts` (add report mutation)

**Anti-patterns:**
- DO NOT duplicate the ExportView — extend the existing one from 4.2
- DO NOT create a separate page — export buttons live in session detail for completed sessions

**Dependencies:** none new

**FRs:** FR20.

## Dev Agent Record (empty: Agent Model Used, Debug Log References, Completion Notes List, File List)
