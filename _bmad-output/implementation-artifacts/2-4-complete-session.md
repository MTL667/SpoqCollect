# Story 2.4: Complete Session

Status: ready-for-dev

## Story

As an inspector,
I want to close an inventory session when I am done,
So that the session is marked as completed and ready for export.

## Acceptance Criteria

1. Active session → tap "Complete Session" → confirmation dialog with total count
2. Confirm → status "completed", end time recorded, final count stored → return to sessions overview
3. Cancel → session unchanged
4. Already completed → no complete button

## Tasks / Subtasks

- [ ] Task 1: Backend PATCH /api/sessions/:id/complete (AC: #2, #4)
  - [ ] Add `PATCH /api/sessions/:id/complete` to `server/src/routes/sessions.ts`
  - [ ] Verify session belongs to req.inspector (403 if not)
  - [ ] Verify session status is "active" (400 if already completed)
  - [ ] Update: status = "completed", completedAt = now()
  - [ ] Return `{ data: session }` with updated session
- [ ] Task 2: Confirmation dialog component (AC: #1, #3)
  - [ ] Create `client/src/shared/components/ConfirmDialog.tsx` (or use existing pattern)
  - [ ] Props: open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel
  - [ ] Reusable for other confirmations
- [ ] Task 3: use-sessions.ts complete mutation (AC: #2)
  - [ ] Add `useCompleteSession()` in use-sessions.ts
  - [ ] Mutation: PATCH /api/sessions/:id/complete
  - [ ] onSuccess: invalidate `['sessions']` and `['sessions', sessionId]`, navigate to /sessions
- [ ] Task 4: SessionDetail UI for complete button (AC: #1, #4)
  - [ ] In SessionDetail.tsx: show "Complete Session" button only when status === "active"
  - [ ] On tap: open ConfirmDialog with message including total object count
  - [ ] On confirm: call useCompleteSession mutation
  - [ ] On cancel: close dialog, no changes

## Dev Notes

### Previous Story Context (Story 2.1–2.3)

- Story 2.1: TanStack Query, POST /api/sessions, CreateSession, use-sessions.ts
- Story 2.2: GET /api/sessions (list), SessionList, useSessions()
- Story 2.3: GET /api/sessions/:id, SessionDetail with virtualized scan list, useSession(), PhotoThumbnail

### Architecture Constraints

- **API response format:** `{ data: T }` success, `{ error: { code, message } }` error
- **Mutation invalidation:** Invalidate both list and detail queries on success
- **Navigation:** After complete, navigate to /sessions (sessions overview)

### PATCH /api/sessions/:id/complete

```typescript
// No request body needed
// Success: 200 { data: InventorySession }
// Error: 400 { error: { code: "SESSION_ALREADY_COMPLETED", message: "..." } }
// Error: 403 { error: { code: "FORBIDDEN", message: "..." } } — not owner
```

### ConfirmDialog Pattern

```typescript
// ConfirmDialog.tsx
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean; // disable during mutation
}
```

### useCompleteSession Mutation Pattern

```typescript
export function useCompleteSession(sessionId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch(`/api/sessions/${sessionId}/complete`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
      navigate('/sessions');
    },
  });
}
```

### Dependencies

- None new

### Anti-Patterns to Avoid

- **DO NOT** allow completing another inspector's session — verify ownership
- **DO NOT** allow completing an already-completed session — return 400
- **DO NOT** forget to set completedAt — required for export and audit

### File Structure Created/Modified

```
server/src/
  routes/
    sessions.ts                  → MODIFIED: Add PATCH /api/sessions/:id/complete

client/src/
  features/sessions/
    SessionDetail.tsx            → MODIFIED: Complete button + ConfirmDialog
    use-sessions.ts              → MODIFIED: Add useCompleteSession()
  shared/components/
    ConfirmDialog.tsx            → NEW: Reusable confirmation dialog
```

### References

- FR4: Complete session
- [Source: Story 2.3] — SessionDetail, useSession
- [Source: architecture.md#State Management Patterns] — mutation invalidation

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
