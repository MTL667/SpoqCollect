# Story 2.1: Create Inventory Session

Status: ready-for-dev

## Story

As an inspector,
I want to create a new inventory session by entering a client address and selecting a building type,
So that I can begin scanning objects at a client location.

## Acceptance Criteria

1. Authenticated + on sessions overview → tap "New Session" → form with client address text field + building type dropdown from DB
2. Submit valid form → session created (status "active", inspector ID, timestamp, count 0) → navigate to session detail → response `{ "data": { "id": "...", "status": "active", ... } }`
3. Submit without address or building type → inline validation errors, no session created

## Tasks / Subtasks

- [ ] Task 1: Install TanStack Query (AC: all)
  - [ ] Install `@tanstack/react-query` and `@tanstack/react-query-devtools` (dev)
  - [ ] Create `shared/lib/query-client.ts` with QueryClient config
  - [ ] Wrap app in `QueryClientProvider` in `client/src/main.tsx`
  - [ ] Add React Query DevTools (dev only)
- [ ] Task 2: Backend POST /api/sessions route (AC: #2)
  - [ ] Create `server/src/routes/sessions.ts`
  - [ ] `POST /api/sessions` — body: `{ clientAddress: string, buildingTypeId: string }`
  - [ ] Validate required fields; return 400 with `{ error: { code, message } }` if invalid
  - [ ] Use `req.inspector` from auth middleware for `inspectorId`
  - [ ] Create session via Prisma: status "active", inspectorId, clientAddress, buildingTypeId
  - [ ] Return `{ data: session }` with created session
  - [ ] Register route in server.ts (after auth middleware)
- [ ] Task 3: Frontend CreateSession component (AC: #1, #3)
  - [ ] Create `client/src/features/sessions/CreateSession.tsx`
  - [ ] Form: client address text field, building type dropdown (from GET /api/building-types)
  - [ ] Inline validation: required address and building type before submit
  - [ ] On valid submit: call create mutation, navigate to `/sessions/:id` on success
- [ ] Task 4: use-sessions.ts TanStack Query hooks (AC: #2)
  - [ ] Create `client/src/features/sessions/use-sessions.ts`
  - [ ] `useCreateSession()` mutation with `onSuccess` invalidation of `['sessions']`
  - [ ] Use api-client for POST /api/sessions
- [ ] Task 5: SessionList placeholder + React Router routes (AC: #1)
  - [ ] Create `client/src/features/sessions/SessionList.tsx` (placeholder with "New Session" button)
  - [ ] Add routes: `/sessions` (SessionList), `/sessions/new` (CreateSession), `/sessions/:id` (SessionDetail placeholder)
  - [ ] "New Session" button navigates to `/sessions/new`

## Dev Notes

### Previous Story Context (Story 1.1–1.4)

- Story 1.1: Monorepo, Prisma schema (7 models including InventorySession), Express server, health endpoint, Prisma singleton at `server/src/lib/prisma.ts`
- Story 1.2: Seed data (39 object types, 12 building types), GET /api/object-types, GET /api/building-types
- Story 1.3: JWT auth (login endpoint, auth middleware, LoginForm.tsx, use-auth.ts, api-client.ts with JWT, React Router with protected routes)
- Story 1.4: Multi-stage Dockerfile, docker-compose with app service

### Architecture Constraints

- **API response format:** `{ data: T }` success, `{ error: { code: string, message: string } }` error
- **Naming:** snake_case DB, camelCase TS, PascalCase components, kebab-case files/endpoints
- **Auth middleware:** On all /api/* except /api/auth/login and /api/health; attaches `req.inspector`
- **TanStack Query:** Use for ALL server state; query keys: `['sessions']`, `['sessions', sessionId]`, `['sessions', sessionId, 'scans']`
- **Object types / building types:** Cached with `staleTime: Infinity`
- **Frontend features:** `client/src/features/sessions/` with co-located components, hooks, tests
- **Routes:** `server/src/routes/sessions.ts`

### Query Client Setup Pattern

```typescript
// shared/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes default
    },
  },
});
```

```typescript
// client/src/main.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '../shared/lib/query-client';

// Wrap App with QueryClientProvider
<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Create Session Mutation Pattern

```typescript
// use-sessions.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/lib/api-client';

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { clientAddress: string; buildingTypeId: string }) => {
      const res = await apiClient.post('/api/sessions', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
```

### POST /api/sessions Route Pattern

```typescript
// server/src/routes/sessions.ts
// POST /api/sessions
// Body: { clientAddress: string, buildingTypeId: string }
// Auth: required (req.inspector)
// Success: 201 { data: InventorySession }
// Error: 400 { error: { code: "VALIDATION_ERROR", message: "..." } }
```

### Dependencies to Install

- `@tanstack/react-query`
- `@tanstack/react-query-devtools` (dev)

### Anti-Patterns to Avoid

- **DO NOT** use raw `fetch` in components — use TanStack Query mutations
- **DO NOT** skip QueryClientProvider setup — TanStack Query requires it
- **DO NOT** put query-client in client-only — use `shared/lib/` for shared config
- **DO NOT** allow unauthenticated POST to /api/sessions — auth middleware must run first

### File Structure Created/Modified

```
shared/
  lib/
    query-client.ts              → NEW: QueryClient config

client/src/
  main.tsx                       → MODIFIED: QueryClientProvider + DevTools
  features/sessions/
    CreateSession.tsx            → NEW: Create session form
    SessionList.tsx              → NEW: Placeholder with "New Session" button
    use-sessions.ts              → NEW: useCreateSession mutation

server/src/
  routes/
    sessions.ts                  → NEW: POST /api/sessions
  server.ts                      → MODIFIED: Register sessions route
```

### References

- FR1: Create inventory session
- FR27: Session metadata (client address, building type, inspector, timestamps)
- [Source: architecture.md#State Management Patterns] — TanStack Query, query keys
- [Source: architecture.md#Project Structure] — features/sessions, routes/sessions

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
