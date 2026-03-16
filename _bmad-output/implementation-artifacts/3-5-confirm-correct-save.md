# Story 3.5: Confirm, Correct & Save Scan Record

Status: ready-for-dev

## Story (As a / I want / so that)

As an inspector, I want to confirm or correct the AI suggestion before saving, so that every record has verified classification and complete audit trail.

## Acceptance Criteria

1. Confirm/select → ScanRecord updated with confirmedTypeId, inspectorId, confirmedAt. AI fields preserved (FR26). Session count incremented
2. High-confidence confirm → confirmed=ai_proposed
3. Correction → confirmed≠ai_proposed, both retained
4. Saved record contains: photo ref, confirmed type, AI type, AI confidence, inspector ID, timestamp (FR12, FR28)

## Tasks / Subtasks

- [ ] Create PATCH /api/scans/:id/confirm endpoint
- [ ] Endpoint updates confirmedTypeId, confirmedAt, status to "confirmed"
- [ ] Endpoint NEVER modifies aiProposedTypeId or aiConfidence
- [ ] Include inspectorId from auth context
- [ ] Increment session count on confirm
- [ ] Create `ScanConfirm.tsx` component
- [ ] Wire confirm action from ClassificationResult
- [ ] Wire correction action (select different type) to same endpoint
- [ ] Ensure saved record contains: photo ref, confirmed type, AI type, AI confidence, inspector ID, timestamp

## Dev Notes

**Previous Story Context:** Story 3.4 provides 3-tier classification UX. ScanRecord model has confirmedTypeId, confirmedAt, aiProposedTypeId, aiConfidence.

**Architecture Patterns:**
- API: `{ data: T }` / `{ error: { code, message } }`
- Naming: snake_case DB (confirmed_type_id), camelCase TS (confirmedTypeId)

**Confirm Endpoint Behavior:**
- Updates: confirmedTypeId, confirmedAt, status = "confirmed"
- NEVER modifies: aiProposedTypeId, aiConfidence, aiRawResponse

**Key Files:**
- `client/src/features/scan/ScanConfirm.tsx`
- `server/src/routes/scans.ts` (PATCH /api/scans/:id/confirm)

**Dependencies:** none new.

**FRs:** FR11, FR12, FR26, FR28.

## Dev Agent Record

- Agent Model Used:
- Debug Log References:
- Completion Notes List:
- File List:
