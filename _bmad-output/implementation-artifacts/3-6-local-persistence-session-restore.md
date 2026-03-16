# Story 3.6: Local Persistence & Session Restore

Status: ready-for-dev

## Story (As a / I want / so that)

As an inspector, I want scans preserved locally even offline, so that I never lose work.

## Acceptance Criteria

1. Scan captured → immediately to IndexedDB before server (NFR10)
2. Offline → scans in IndexedDB, sync queue accumulates, offline indicator
3. Reconnect → queue syncs in order, retries with backoff (NFR11), progress indicator
4. App crash/close → restore prompt, local scans intact, queue resumes (NFR12)
5. Sync complete → server is source of truth (NFR13), zero loss (NFR14)

## Tasks / Subtasks

- [ ] Add idb library for IndexedDB wrapper
- [ ] Create `client/src/shared/lib/indexed-db.ts` with schema and operations
- [ ] Define IndexedDB stores: pending scans (photo blob + metadata), sync queue state, active session ID
- [ ] Write scan to IndexedDB immediately on capture (before server upload)
- [ ] Create `use-online-status.ts` hook
- [ ] Add offline indicator UI
- [ ] On reconnect: drain sync queue to server in order
- [ ] Implement retry with backoff for failed syncs
- [ ] Add progress indicator during sync
- [ ] On app load: check for local pending scans, show restore prompt if any
- [ ] Resume queue after restore
- [ ] After sync complete: server is source of truth, clear local state

## Dev Notes

**Previous Story Context:** Stories 3.1–3.5 provide full scan flow. TanStack Query for server state.

**Architecture Patterns:**
- Local persistence: IndexedDB via `idb` library
- Storage abstraction pattern for consistency

**IndexedDB Schema:**
- Pending scans: photo blob + metadata (sessionId, scanRecordId, etc.)
- Sync queue state: ordered list of items to sync
- Active session ID: current session being scanned

**Sync Flow:**
- On capture: write to IndexedDB first, then attempt server upload
- Offline: queue accumulates in IndexedDB
- Reconnect: drain queue in order, retry with backoff
- Complete: server is source of truth

**Anti-patterns:**
- DO NOT replace server persistence — IndexedDB is fallback only
- Server remains source of truth after sync

**Key Files:**
- `client/src/shared/lib/indexed-db.ts` (IndexedDB schema + operations)
- `client/src/shared/hooks/use-online-status.ts`
- TanStack Query persistence integration

**Dependencies:** idb (IndexedDB wrapper library)

**FRs:** implied by NFRs. **NFRs:** NFR10, NFR11, NFR12, NFR13, NFR14.

## Dev Agent Record

- Agent Model Used:
- Debug Log References:
- Completion Notes List:
- File List:
