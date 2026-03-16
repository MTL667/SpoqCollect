# Story 2.3: Session Detail & Scanned Objects List

Status: ready-for-dev

## Story

As an inspector,
I want to see all scanned objects within a session as a scrollable list with thumbnails,
So that I can review what has been inventoried and track progress.

## Acceptance Criteria

1. Active session with scans → list showing thumbnail, confirmed object type (Dutch), timestamp. Uses @tanstack/react-virtual
2. 2,000 objects → scroll at 60fps
3. Session header: client address, building type, inspector name, start time, object count
4. Empty session → empty state with scan prompt

## Tasks / Subtasks

- [ ] Task 1: Install @tanstack/react-virtual (AC: #1, #2)
  - [ ] Install `@tanstack/react-virtual`
- [ ] Task 2: Backend GET /api/sessions/:id with scan records (AC: #1, #3)
  - [ ] Add `GET /api/sessions/:id` to `server/src/routes/sessions.ts`
  - [ ] Verify session belongs to req.inspector (403 if not)
  - [ ] Include: session fields, buildingType, inspector, scanRecords with confirmedType (nameNl)
  - [ ] Return `{ data: session }` with nested scan records
- [ ] Task 3: use-sessions.ts detail query (AC: #1)
  - [ ] Add `useSession(sessionId)` with queryKey `['sessions', sessionId]`
  - [ ] Fetch GET /api/sessions/:id
- [ ] Task 4: PhotoThumbnail shared component (AC: #1)
  - [ ] Create `client/src/shared/components/PhotoThumbnail.tsx`
  - [ ] Accept photoPath; render thumbnail (img with src from API or static path)
  - [ ] Placeholder/fallback when no image available
- [ ] Task 5: SessionDetail.tsx with virtualized list (AC: #1, #2, #3, #4)
  - [ ] Create/replace `client/src/features/sessions/SessionDetail.tsx`
  - [ ] Session header: client address, building type (Dutch), inspector name, start time, object count
  - [ ] Virtualized list of scan records using `useVirtualizer` from @tanstack/react-virtual
  - [ ] Each row: PhotoThumbnail, confirmed object type (Dutch), timestamp
  - [ ] Empty state when no scans: prompt to start scanning

## Dev Notes

### Previous Story Context (Story 2.1, 2.2)

- Story 2.1: TanStack Query, POST /api/sessions, CreateSession, use-sessions.ts
- Story 2.2: GET /api/sessions (list), SessionList with status badges, useSessions()

### Architecture Constraints

- **Query keys:** `['sessions', sessionId]` for session detail
- **Virtualization:** @tanstack/react-virtual for 60fps at 2,000 items (NFR4)
- **Object type label:** Use nameNl (Dutch) for confirmed type display
- **Photo paths:** Stored in scan_records.photo_path; served via static route or API (define in this story)

### GET /api/sessions/:id Response Shape

```typescript
// Response: { data: SessionDetail }
interface SessionDetail {
  id: string;
  clientAddress: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  buildingType: { id: string; nameNl: string };
  inspector: { id: string; name: string };
  scanRecords: Array<{
    id: string;
    photoPath: string;
    confirmedTypeId: string | null;
    confirmedType: { nameNl: string } | null;
    createdAt: string;
    status: string;
  }>;
}
```

### useVirtualizer Pattern

```typescript
// SessionDetail.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);
const scanRecords = session?.scanRecords ?? [];

const virtualizer = useVirtualizer({
  count: scanRecords.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80, // row height in px
  overscan: 5,
});

// Render: virtualizer.getVirtualItems().map(virtualRow => ...)
```

### PhotoThumbnail Considerations

- Photo path may be relative (e.g. `/uploads/...`) or need API route (e.g. GET /api/photos/:path)
- For MVP: if photos not yet uploaded, show placeholder (e.g. icon or gray box)
- Thumbnail size: small (e.g. 48x48 or 64x64) for list rows

### Dependencies to Install

- `@tanstack/react-virtual`

### Anti-Patterns to Avoid

- **DO NOT** render all 2,000 items in DOM — use virtualization
- **DO NOT** forget to verify session ownership (inspectorId) — return 403 for other inspectors
- **DO NOT** use staleTime: Infinity for session detail — sessions change as scans are added

### File Structure Created/Modified

```
server/src/
  routes/
    sessions.ts                  → MODIFIED: Add GET /api/sessions/:id

client/src/
  features/sessions/
    SessionDetail.tsx            → NEW/MODIFIED: Header + virtualized scan list
    use-sessions.ts              → MODIFIED: Add useSession(sessionId) query
  shared/components/
    PhotoThumbnail.tsx           → NEW: Thumbnail component
```

### References

- FR5: View scanned objects in session
- FR27: Session metadata
- NFR4: 60fps scroll at 2,000 items
- [Source: architecture.md#Gap 1 — Virtualized List] — useVirtualizer in SessionDetail
- [Source: architecture.md#Project Structure] — PhotoThumbnail in shared/components

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
