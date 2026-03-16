# Story 2.2: Session List & Resume

Status: ready-for-dev

## Story

As an inspector,
I want to see all my inventory sessions and resume an active one,
So that I can continue work across multiple client visits.

## Acceptance Criteria

1. Authenticated → sessions overview → list of all MY sessions: client address, building type (Dutch), status badge, start date, object count, sorted by most recent
2. Tap active session → navigate to session detail (continue scanning)
3. Tap completed session → navigate to read-only session detail
4. No sessions → empty state with prompt

## Tasks / Subtasks

- [ ] Task 1: Backend GET /api/sessions (AC: #1)
  - [ ] Add `GET /api/sessions` to `server/src/routes/sessions.ts`
  - [ ] Filter by `inspectorId` from `req.inspector`
  - [ ] Include: clientAddress, buildingType (with nameNl), status, createdAt, _count of scanRecords
  - [ ] Order by `createdAt` desc (most recent first)
  - [ ] Return `{ data: sessions[] }`
- [ ] Task 2: use-sessions.ts query hook (AC: #1)
  - [ ] Add `useSessions()` in `use-sessions.ts` with queryKey `['sessions']`
  - [ ] Fetch GET /api/sessions via api-client
  - [ ] Return data, isLoading, isError for SessionList
- [ ] Task 3: SessionList.tsx with status badges (AC: #1, #2, #3, #4)
  - [ ] Replace placeholder with full SessionList component
  - [ ] Use `useSessions()` to load sessions
  - [ ] Render list: client address, building type (Dutch), status badge (active/completed), start date, object count
  - [ ] Tap row → navigate to `/sessions/:id` (same for active and completed)
  - [ ] Empty state when no sessions: prompt to create first session
  - [ ] "New Session" button visible
- [ ] Task 4: Navigation logic (AC: #2, #3)
  - [ ] Ensure SessionDetail route `/sessions/:id` exists and receives sessionId param
  - [ ] SessionDetail can be placeholder for now (full implementation in Story 2.3)

## Dev Notes

### Previous Story Context (Story 2.1)

- Story 2.1: TanStack Query setup, POST /api/sessions, CreateSession.tsx, use-sessions.ts with useCreateSession, SessionList placeholder, routes /sessions, /sessions/new, /sessions/:id

### Architecture Constraints

- **API response format:** `{ data: T }` success, `{ error: { code, message } }` error
- **Query keys:** `['sessions']` for list
- **Auth:** All /api/* protected; req.inspector available
- **Building type label:** Use `nameNl` (Dutch) for display per architecture (pilot: Dutch UI)

### GET /api/sessions Response Shape

```typescript
// Response: { data: SessionListItem[] }
interface SessionListItem {
  id: string;
  clientAddress: string;
  status: string;
  createdAt: string; // ISO 8601
  buildingType: { id: string; nameNl: string };
  _count: { scanRecords: number };
}
```

### useSessions Query Pattern

```typescript
// use-sessions.ts
export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await apiClient.get('/api/sessions');
      return res.data;
    },
  });
}
```

### Status Badge Pattern

- **active** → badge "Actief" (e.g. green/blue)
- **completed** → badge "Voltooid" (e.g. gray)

### Dependencies

- None new (TanStack Query from Story 2.1)

### Anti-Patterns to Avoid

- **DO NOT** return sessions for other inspectors — filter strictly by req.inspector.id
- **DO NOT** use raw fetch — use useSessions() from TanStack Query
- **DO NOT** forget _count for scanRecords — object count is required in AC

### File Structure Created/Modified

```
server/src/
  routes/
    sessions.ts                  → MODIFIED: Add GET /api/sessions

client/src/
  features/sessions/
    SessionList.tsx              → MODIFIED: Full list with status badges, empty state
    use-sessions.ts              → MODIFIED: Add useSessions() query
```

### References

- FR2: List sessions
- FR3: Resume active session
- [Source: Story 2.1] — use-sessions.ts, SessionList placeholder
- [Source: architecture.md#State Management Patterns] — query keys

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
