# Story 1.3: Inspector Authentication

Status: ready-for-dev

## Story

As an inspector,
I want to log in with my credentials,
So that my identity is recorded on all scans I perform.

## Acceptance Criteria

1. Valid credentials → JWT token with `inspectorId` and `email` claims → redirect to sessions overview
2. Invalid credentials → HTTP 401 with `{ "error": { "code": "INVALID_CREDENTIALS", "message": "..." } }`
3. No token or expired token → HTTP 401 with `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }`
4. Token stored securely and included in all API requests via Authorization header

## Tasks / Subtasks

- [ ] Task 1: JWT helpers (AC: #1, #3)
  - [ ] Create `server/src/lib/jwt.ts` with sign and verify functions
  - [ ] Token payload: `inspectorId`, `email`, `name`, `role`
  - [ ] Use JWT_SECRET from config, reasonable expiry (e.g. 7 days)
- [ ] Task 2: Auth route (AC: #1, #2)
  - [ ] Create `server/src/routes/auth.ts`
  - [ ] `POST /api/auth/login` — validate email + password against Inspector table
  - [ ] Use bcrypt `compare()` for password verification (bcrypt already in Story 1.2)
  - [ ] On success: return `{ data: { token, inspector: { id, email, name, role } } }`
  - [ ] On invalid credentials: return 401 with INVALID_CREDENTIALS
  - [ ] Register route in server.ts
- [ ] Task 3: Auth middleware (AC: #3, #4)
  - [ ] Create `server/src/middleware/auth.ts`
  - [ ] Verify JWT on all `/api/*` except `/api/auth/login` and `/api/health`
  - [ ] Attach `req.inspector` (or `req.user`) with decoded claims
  - [ ] On missing/expired token: return 401 with UNAUTHORIZED
  - [ ] Apply middleware to protected routes
- [ ] Task 4: Frontend LoginForm component (AC: #1, #2)
  - [ ] Create `client/src/features/auth/LoginForm.tsx`
  - [ ] Form fields: email, password
  - [ ] Submit calls POST /api/auth/login
  - [ ] On success: store token, redirect to sessions overview
  - [ ] On error: display INVALID_CREDENTIALS message
- [ ] Task 5: Frontend use-auth hook (AC: #4)
  - [ ] Create `client/src/features/auth/use-auth.ts`
  - [ ] Token storage: in-memory primary, localStorage fallback
  - [ ] Expose: `login`, `logout`, `token`, `isAuthenticated`, `inspector`
  - [ ] Include token in all API requests via Authorization header
- [ ] Task 6: React Router setup with protected routes (AC: #1)
  - [ ] Add React Router 7 to client
  - [ ] Configure routes: Login, Sessions (placeholder for overview)
  - [ ] Protected route wrapper: redirect unauthenticated users to Login
  - [ ] Authenticated users hitting /login redirect to sessions
- [ ] Task 7: API client with JWT header (AC: #4)
  - [ ] Create `client/src/shared/lib/api-client.ts` (or `client/src/lib/api-client.ts`)
  - [ ] Centralized fetch wrapper that adds `Authorization: Bearer <token>` to all requests
  - [ ] Handle 401 responses (clear token, redirect to login)

## Dev Notes

### Previous Story Context (Story 1.1, 1.2)

- Story 1.1: Monorepo, Prisma schema, Express server, health endpoint, error handler, logger, Prisma singleton
- Story 1.2: Seed data (39 object types, 12 building types, test inspector `test@inventarispoq.be` with bcrypt-hashed password), GET /api/object-types, GET /api/building-types

### Architecture Constraints

- **API response format:** `{ data: T }` success, `{ error: { code: string, message: string } }` error
- **Naming:** snake_case DB, camelCase TS, PascalCase components, kebab-case files/endpoints
- **Auth:** JWT tokens with inspectorId + email claims. Token in Authorization header. Express middleware validates.
- **CORS:** Restricted to app domain in production

### JWT Helpers Pattern

```typescript
// server/src/lib/jwt.ts
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export type JwtPayload = { inspectorId: string; email: string; name: string; role: string };

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
}
```

### Auth Route Pattern

```typescript
// server/src/routes/auth.ts
// POST /api/auth/login
// Body: { email: string, password: string }
// Success: { data: { token, inspector } }
// Error: 401 { error: { code: "INVALID_CREDENTIALS", message: "..." } }
```

### Auth Middleware Pattern

```typescript
// server/src/middleware/auth.ts
// Extract Bearer token from Authorization header
// Verify via jwt.verify; on success attach req.inspector = payload
// On fail: res.status(401).json({ error: { code: "UNAUTHORIZED", message: "..." } })
```

### Frontend Auth Structure

```
client/src/features/auth/
  LoginForm.tsx      → Form component
  use-auth.ts       → Hook for token management, login, logout
```

### Protected Route Pattern (React Router 7)

```typescript
// Wrap protected routes; if !isAuthenticated, navigate to /login
// If on /login and isAuthenticated, navigate to /sessions
```

### Dependencies (This Story Only)

- **Server:** `jsonwebtoken` + `@types/jsonwebtoken` (dev)
- **Client:** `react-router` (v7) — or `react-router-dom` as per React Router 7 package name

### Anti-Patterns to Avoid

- **DO NOT** install TanStack Query yet — that's Story 2.x
- **DO NOT** create session pages yet — use a placeholder (e.g. "Sessions" text) for redirect target
- **DO NOT** store JWT in cookies for this story — use Authorization header with in-memory/localStorage
- **DO NOT** protect /api/health or /api/auth/login with auth middleware

### File Structure Notes

Files created/modified in this story:

```
server/src/
  lib/
    jwt.ts                    → NEW: sign/verify JWT
  routes/
    auth.ts                   → NEW: POST /api/auth/login
  middleware/
    auth.ts                   → NEW: JWT verification middleware
  server.ts                   → MODIFIED: Register auth route, apply auth middleware

client/src/
  features/auth/
    LoginForm.tsx             → NEW: Login form component
    use-auth.ts               → NEW: Auth state + token management
  lib/
    api-client.ts             → NEW: Fetch wrapper with Bearer token (or shared/lib if shared)
  App.tsx                     → MODIFIED: React Router, protected routes
  main.tsx                    → MODIFIED: Wrap with Router if needed
```

### References

- [Source: epics.md#Story 1.3] — Acceptance criteria
- [Source: architecture.md] — Auth patterns, JWT, middleware
- [Source: Story 1.2] — Test inspector credentials, bcrypt
- FR24: Inspector login
- FR25: Associate scans with inspector
- NFR7: Basic auth
- NFR9: Data only to authenticated users

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
