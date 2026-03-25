---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-12'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/prd-validation-report.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-12-1300.md'
  - '_bmad-output/planning-artifacts/asset-uitbreiding-brand-veiligheid-odoo.md'
workflowType: 'architecture'
project_name: 'InventariSpoq'
user_name: 'Kevin'
date: '2026-03-12'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Supplementary domain requirements (BMAD-geladen, 2026-03-25)

Het document **`asset-uitbreiding-brand-veiligheid-odoo.md`** is opgenomen in `inputDocuments` en beschrijft uitbreidingen op het asset- en inspectiemodel: **hiërarchie (gebouw / installatie / subasset)**, **conditionele vragen op vaste sessie-momenten**, en een **tweede exportlaag naar Odoo** (diensten/productcodes naast bestaande Heli OM + clientrapport). Nieuwe architectuurbeslissingen rond parent-child op scanrecords, vraag-engine per objecttype, en ERP-mapping moeten tegen dit document worden afgezet tot de ADR-secties hieronder expliciet zijn bijgewerkt.

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
28 FRs across 6 categories driving a camera-to-export pipeline:
- Session Management (FR1-FR5): CRUD, state persistence, session lifecycle
- Object Scanning & Recognition (FR6-FR12): Camera capture → AI classification → inspector confirm/correct → store
- Object Type Data Model (FR13-FR15): Configurable registry with bilingual labels and building type filtering
- Heli OM Export (FR16-FR19): Server-side 29-column Excel generation with domain-specific column mapping
- Client Report Export (FR20-FR23): Server-side bilingual PDF with embedded photos per object
- Authentication & Data Integrity (FR24-FR28): Basic auth, immutable audit trail, photo retention

**Non-Functional Requirements:**
- Performance: Camera < 1s, AI result < 3s, scan-to-next-scan < 1s, 60fps scroll at 2,000 items, export < 30s
- Architecture-driving: Background queue (photo upload + AI never blocks UI), local-first persistence, zero data loss
- Security: HTTPS, server-side API keys, basic auth
- Scale: ~30 concurrent inspectors, up to 2,000 objects/session, photo-intensive storage
- Deployment: Single Docker container on Easypanel, company-owned server

**Scale & Complexity:**
- Primary domain: Full-stack PWA with AI vision backend
- Complexity level: High — AI integration, dual-export, configurable data model, local-first sync
- Estimated architectural components: 6 (PWA frontend, API server, AI service integration, file generation service, database/storage, background job queue)

### Technical Constraints & Dependencies

- **iPad Safari primary browser** — Web API availability (MediaDevices, Service Workers, IndexedDB) limited vs. Chrome. Must test camera access day 1
- **OpenAI Vision API** — External dependency for core functionality. Latency, cost, rate limits affect architecture
- **Solo developer, 1-week pilot** — Architecture must minimize moving parts. Simplicity over elegance. Monolith preferred over microservices
- **Docker on Easypanel** — Single-container or minimal multi-container deployment. No Kubernetes, no cloud-native services
- **File-based handoff** — No direct system integration. Export files downloaded manually by backoffice

### Cross-Cutting Concerns Identified

- **Bilingual (NL/FR):** Object type labels, client report content, UI strings — requires i18n strategy across frontend and backend
- **Audit trail:** Every scan records inspector, timestamp, AI proposal, inspector decision, photo — spans scanning, storage, and export layers
- **Background processing:** Photo upload and AI classification run asynchronously — affects frontend state management, API design, and error handling
- **Local persistence:** Scans survive connectivity loss and app crashes — requires local storage strategy (IndexedDB/localStorage) with sync protocol
- **Configurable data model:** Object types, building types, Heli OM column mapping as data — influences database schema and admin workflows
- **Graceful degradation:** Three-tier confidence model, connectivity loss fallback, camera API fallback — error handling is a first-class concern

## Starter Template Evaluation

### Primary Technology Domain

Full-stack PWA with AI vision backend — React SPA frontend + Node.js API server + PostgreSQL database

### User Technical Preferences

- **Frontend:** React (explicit preference)
- **Database:** PostgreSQL on Easypanel (explicit preference)
- **IDE:** Cursor
- **Builder:** Solo developer, 1-week pilot target
- **Deployment:** Docker on Easypanel (company-owned server)

### Starter Options Considered

**Option A: Next.js 16 (Full-Stack Framework)**
- All-in-one: React frontend + API routes + SSR
- Turbopack default bundler, ~92KB bundle
- Rejected: SSR complexity unnecessary for internal tool. Known WebKit bug with getUserMedia camera access in standalone PWA mode on iOS — camera stream can freeze. Heavier than needed.

**Option B: Vite 8 + React SPA + Express Backend**
- Vite for frontend: <2s startup, instant HMR, ~42KB bundle
- @vite-pwa plugin for service worker and PWA config
- Express as API server for AI calls, file generation, database access
- Single repo, single Docker container
- Selected: Explicitly recommended for SPAs, dashboards, internal tools. Simplest mental model for camera-centric app.

**Option C: T3 Stack (Next.js + tRPC + Prisma)**
- Type-safe full-stack with tRPC
- Rejected: Overkill for scope. More complexity than needed. Steeper learning curve for 1-week pilot.

### Selected Starter: Vite + React + Express Monorepo

**Rationale for Selection:**
1. Fastest dev experience — Vite HMR is instant, critical for 1-week deadline
2. SPA fits the app — camera-centric, internal tool, no SEO needed
3. PWA out of the box — @vite-pwa plugin handles service worker configuration
4. No iOS camera bug risk — no standalone PWA mode needed for MVP
5. Simplest Docker deployment — Express serves both API and built frontend static files
6. PostgreSQL via Prisma 7 — type-safe, fully TypeScript-native ORM, 3x faster queries

**Initialization Command:**

```bash
npm create @vite-pwa/pwa@latest inventarispoq -- --template react-ts
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript throughout (frontend + backend). Vite 8 with React 19. Node.js runtime for Express backend.

**Styling Solution:**
Tailwind CSS 4.x — utility-first, fast iteration, excellent for building responsive iPad-optimized interfaces.

**Build Tooling:**
Vite 8 with Rollup for production builds. Turbopack-free (Vite's own HMR is faster). ~42KB production bundles.

**Testing Framework:**
Vitest (Vite-native) for unit tests. Playwright for E2E (post-MVP).

**Code Organization:**
Monorepo structure: `/client` (Vite React SPA) + `/server` (Express API) + `/prisma` (schema + migrations). Single `package.json` at root or workspace setup.

**Development Experience:**
Vite dev server with instant HMR. TypeScript strict mode. ESLint + Prettier. Cursor IDE with full TypeScript IntelliSense.

**Full Tech Stack:**

| Layer | Technology | Version |
|---|---|---|
| Frontend | Vite + React + TypeScript | Vite 8, React 19 |
| Styling | Tailwind CSS | 4.x |
| PWA | @vite-pwa/create-pwa | 1.x |
| Backend | Express + TypeScript | 5.x |
| ORM | Prisma | 7.5 |
| Database | PostgreSQL | on Easypanel |
| AI | OpenAI Vision API | — |
| Excel Export | exceljs | — |
| PDF Export | puppeteer or @react-pdf | — |
| Deployment | Docker | Easypanel |

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Photo storage: Filesystem with storage abstraction layer
- Background processing: PostgreSQL-based job queue
- Auth: JWT tokens
- State management: TanStack Query
- Local persistence: IndexedDB for zero data loss

**Important Decisions (Shape Architecture):**
- Single Docker container deployment
- REST API design
- Camera integration via getUserMedia hook
- Structured logging with pino

**Deferred Decisions (Post-MVP):**
- S3-compatible object storage migration
- Multi-container deployment (Nginx + Express split)
- Redis-based job queue (BullMQ)
- Full monitoring/alerting stack

### Data Architecture

**Database:** PostgreSQL on Easypanel via Prisma 7.5
- Prisma Migrate for schema changes
- Strict TypeScript types generated from schema

**Photo Storage:** Server filesystem (`/data/photos`) with persistent Docker volume mount
- Storage abstraction layer (interface) enabling future migration to S3-compatible storage
- Photos referenced by path in scan records
- Docker volume mount ensures persistence across container restarts

**Caching:** In-memory cache at server startup for object types, building types, Heli OM column mapping
- Reload on configuration change
- No Redis needed — ~50 object types and ~12 building types fit comfortably in memory

**Migrations:** Prisma Migrate with version-controlled migration files in `/prisma/migrations`

### Authentication & Security

**Authentication:** JWT tokens
- Login endpoint returns signed JWT
- Frontend stores token in memory (with localStorage fallback for session persistence)
- All API requests include Bearer token
- Token contains: inspector ID, name, role

**API Key Security:** OpenAI API key stored server-side only as environment variable
- Frontend never contacts OpenAI directly
- All AI requests proxied through Express API

**CORS:** Express CORS middleware restricted to application domain only

### API & Communication Patterns

**API Style:** REST with JSON payloads
- Resource-based endpoints: `/api/sessions`, `/api/sessions/:id/scans`, `/api/exports`
- Consistent error responses: `{ error: string, code: string }`
- HTTP status codes for all outcomes

**Background Processing:** PostgreSQL-based job queue
- `scan_jobs` table with status column (pending → processing → done/failed)
- Polling worker process within the same Express server
- Handles: photo upload to storage, AI classification request, result storage
- Retry logic for failed AI calls
- No extra infrastructure needed — reuses existing PostgreSQL

**File Upload:** Multipart upload via `multer` middleware
- Photos uploaded to filesystem, path stored in database
- Size limit appropriate for iPad camera photos (~5-10MB)

**Error Handling:** Standardized JSON error responses
- `{ error: string, code: string, details?: object }`
- HTTP status codes: 400 (validation), 401 (auth), 404 (not found), 500 (server)
- AI classification errors handled gracefully — scan saved with "pending" status for retry

### Frontend Architecture

**State Management:** TanStack Query (React Query)
- Server state: sessions, scans, object types, building types
- Caching: object type registry cached indefinitely (stale-while-revalidate)
- Optimistic updates: scan confirmation updates UI immediately, syncs in background
- Mutation queue: scans queued locally, sent to server when available

**Local UI State:** React useState/useContext for ephemeral state (camera status, active scan flow, UI navigation)

**Camera Integration:** Custom React hook wrapping `navigator.mediaDevices.getUserMedia()`
- `facingMode: 'environment'` for iPad rear camera
- Photo capture via canvas element from video stream
- Blob output for upload

**Local Persistence:** IndexedDB (via `idb` library) for zero data loss
- Scan records + photo blobs stored locally before server sync
- TanStack Query persistence plugin for query cache survival
- On reconnect: local scans sync to server automatically

**Routing:** React Router 7
- Views: Login, Session List, Session Detail/Scan Flow, Export, (Admin post-MVP)
- Client-side routing — SPA, no server-side routing needed

### Infrastructure & Deployment

**Container Strategy:** Single Docker container for pilot
- Express serves Vite production build (static files) + API endpoints
- Single process, single container on Easypanel
- Option to split into Nginx + Express later if needed

**PostgreSQL:** Managed service on Easypanel
- Connected via `DATABASE_URL` environment variable

**Photo Storage:** Persistent volume mount in Easypanel at `/data/photos`
- Survives container restarts and redeployments

**Environment Variables:**
- `DATABASE_URL` — PostgreSQL connection string
- `OPENAI_API_KEY` — Vision API key
- `JWT_SECRET` — Token signing secret
- `STORAGE_PATH` — Photo directory path (default: `/data/photos`)
- `NODE_ENV` — production/development

**Logging:** Structured JSON logging via `pino`
- Stdout output captured by Easypanel logs
- Request logging with response times

**Health Check:** `/api/health` endpoint for Easypanel container monitoring

### Decision Impact Analysis

**Implementation Sequence:**
1. Project scaffolding (Vite + Express + Prisma)
2. Database schema + migrations
3. JWT auth flow
4. Camera capture hook
5. Photo upload + storage
6. AI classification integration + PostgreSQL queue
7. Scan flow UI (capture → classify → confirm)
8. Session management CRUD
9. Heli OM Excel export
10. Client report PDF export

**Cross-Component Dependencies:**
- Background queue depends on: Prisma schema (scan_jobs table), photo storage, OpenAI integration
- Export depends on: complete scan data with confirmed object types, photo storage paths
- Local persistence depends on: TanStack Query setup, IndexedDB schema mirroring server models
- Camera hook depends on: iPad Safari getUserMedia support (test day 1)

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 6 areas where AI agents could make different choices — naming, structure, API format, state management, error handling, and date/time handling.

### Naming Patterns

**Database Naming Conventions:**
- Tables: snake_case, plural (`inventory_sessions`, `scan_records`, `object_types`)
- Columns: snake_case (`object_type_id`, `created_at`, `ai_confidence`)
- Foreign keys: `{referenced_table_singular}_id` (`session_id`, `inspector_id`)
- Indexes: `idx_{table}_{columns}` (`idx_scan_records_session_id`)
- Prisma handles mapping: snake_case in DB ↔ camelCase in TypeScript via `@map` / `@@map`

**API Naming Conventions:**
- Endpoints: kebab-case, plural nouns (`/api/sessions`, `/api/scan-records`, `/api/object-types`)
- Route parameters: `:id` format (`/api/sessions/:id/scans`)
- Query parameters: camelCase (`?buildingType=kantoor&status=active`)
- No trailing slashes

**Code Naming Conventions:**
- Variables/functions: camelCase (`sessionId`, `getObjectTypes()`)
- React components: PascalCase files and exports (`ScanFlow.tsx`, `SessionList.tsx`)
- Non-component files: kebab-case (`use-camera.ts`, `auth-middleware.ts`, `api-client.ts`)
- Types/Interfaces: PascalCase, no `I` prefix (`InventorySession`, `ScanRecord`, `ObjectType`)
- Constants: UPPER_SNAKE_CASE for true constants (`MAX_PHOTO_SIZE`, `AI_CONFIDENCE_THRESHOLD`)
- Hooks: `use-` prefix in filename, `use` prefix in export (`use-camera.ts` → `useCamera()`)

### Structure Patterns

**Project Organization:** Feature-based with shared utilities

```
/client/src/
  features/
    scan/              → ScanFlow.tsx, use-camera.ts, scan.test.ts
    sessions/          → SessionList.tsx, SessionDetail.tsx
    export/            → ExportView.tsx
    auth/              → LoginForm.tsx
  shared/
    components/        → Button.tsx, LoadingSpinner.tsx
    hooks/             → use-auth.ts
    lib/               → api-client.ts, indexed-db.ts
  App.tsx
  main.tsx

/server/src/
  routes/
    sessions.ts        → /api/sessions endpoints
    scans.ts           → /api/scans endpoints
    exports.ts         → /api/exports endpoints
    auth.ts            → /api/auth endpoints
  services/
    ai-classifier.ts   → OpenAI Vision integration
    export-heli.ts     → Excel generation
    export-report.ts   → PDF generation
    storage.ts         → Photo storage abstraction
    queue.ts           → PostgreSQL job queue
  middleware/
    auth.ts            → JWT verification
    error-handler.ts
    upload.ts          → Multer config
  server.ts            → Express app entry

/prisma/
  schema.prisma
  migrations/
  seed.ts              → Object types, building types seed data
```

**File Structure Rules:**
- Tests co-located with source files (`*.test.ts` next to `*.ts`)
- One component per file
- Index files only for barrel exports from feature folders
- Environment files at project root (`.env`, `.env.example`)

### Format Patterns

**API Response Formats:**

```typescript
// Success response
{ data: T }

// Error response
{ error: { code: string, message: string } }

// Paginated response (future)
{ data: T[], meta: { total: number, page: number } }
```

**JSON Field Naming:** camelCase in all API request/response bodies
- Prisma serialization produces camelCase automatically
- Frontend sends and receives camelCase

**Date/Time Format:**
- API: ISO 8601 strings (`2026-03-12T14:30:00Z`)
- Database: `timestamptz` columns (timezone-aware)
- Frontend display: `date-fns` for locale-aware formatting

**Boolean Handling:** `true`/`false` (never `1`/`0`, never `"true"/"false"`)

**Null Handling:** Explicit `null` for absent optional values (never `undefined` in API responses)

### Communication Patterns

**State Management Patterns:**
- TanStack Query for all server state (sessions, scans, object types)
- Query keys follow array format: `['sessions']`, `['sessions', sessionId]`, `['sessions', sessionId, 'scans']`
- Mutations use `useMutation` with `onSuccess` invalidation
- Optimistic updates for scan confirmation (update cache immediately, rollback on error)
- Object type registry: `staleTime: Infinity` (load once, refresh on explicit action)

**Local UI State:** React useState/useContext only for ephemeral state
- Camera status, active scan step, UI navigation, form inputs
- Never duplicates server state

### Process Patterns

**Error Handling:**
- Backend: Express error middleware catches all, logs via pino, returns standardized JSON
- Frontend: TanStack Query `onError` callbacks + React Error Boundary as safety net
- AI classification errors: scan saved with `status: 'classification_pending'`, retry in queue
- Network errors: local scan preserved in IndexedDB, synced on reconnect
- User-facing errors: Dutch language, actionable messages

**Loading State Patterns:**
- TanStack Query provides: `isLoading` (first load), `isFetching` (background refresh), `isError`
- Camera hook states: `idle → starting → active → error`
- Scan flow states: `idle → capturing → uploading → classifying → confirming → confirmed`
- Export states: `idle → generating → ready → downloaded`

**Validation:**
- Frontend: form-level validation before submit (required fields, building type selection)
- Backend: request validation middleware (Zod schemas matching Prisma types)
- Single source of truth: Zod schemas shared or mirrored between client/server

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow naming conventions exactly as specified above
- Use the feature-based folder structure — never create new top-level folders without explicit instruction
- Return API responses in the standard `{ data }` / `{ error }` wrapper format
- Use TanStack Query for all server data — never raw `fetch` in components
- Handle errors at every level (API call, mutation, component boundary)
- Use TypeScript strict mode — no `any` types without explicit justification

### Pattern Examples

**Good:**
```typescript
// API endpoint
app.get('/api/sessions/:id/scans', authMiddleware, async (req, res) => {
  const scans = await prisma.scanRecord.findMany({ where: { sessionId: req.params.id } });
  res.json({ data: scans });
});

// Frontend query
const { data: scans } = useQuery({
  queryKey: ['sessions', sessionId, 'scans'],
  queryFn: () => apiClient.get(`/api/sessions/${sessionId}/scans`),
});
```

**Anti-Patterns:**
```typescript
// WRONG: raw fetch in component
const [scans, setScans] = useState([]);
useEffect(() => { fetch('/api/scans').then(...) }, []);

// WRONG: inconsistent response format
res.json(scans);          // Missing { data: } wrapper
res.json({ scans });      // Wrong key name

// WRONG: snake_case in TypeScript
const session_id = req.params.id;   // Should be sessionId
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
inventarispoq/
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── .env
├── .gitignore
├── Dockerfile
├── docker-compose.yml              → Local dev with PostgreSQL
│
├── client/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── public/
│   │   ├── manifest.json           → PWA manifest
│   │   ├── favicon.ico
│   │   └── icons/                  → PWA icons (192, 512)
│   └── src/
│       ├── main.tsx                → App entry + QueryClient + Router
│       ├── App.tsx                 → Route definitions
│       ├── index.css               → Tailwind imports
│       │
│       ├── features/
│       │   ├── auth/
│       │   │   ├── LoginForm.tsx
│       │   │   ├── use-auth.ts     → JWT token management
│       │   │   └── auth.test.ts
│       │   │
│       │   ├── sessions/
│       │   │   ├── SessionList.tsx
│       │   │   ├── SessionDetail.tsx
│       │   │   ├── CreateSession.tsx
│       │   │   ├── use-sessions.ts → TanStack Query hooks
│       │   │   └── sessions.test.ts
│       │   │
│       │   ├── scan/
│       │   │   ├── ScanFlow.tsx     → Camera → AI → Confirm flow
│       │   │   ├── CameraView.tsx   → Video stream + capture
│       │   │   ├── ClassificationResult.tsx → AI result display
│       │   │   ├── ObjectTypeSelector.tsx   → Full type list fallback
│       │   │   ├── ScanConfirm.tsx  → Confirm/correct step
│       │   │   ├── use-camera.ts    → getUserMedia hook
│       │   │   ├── use-scan.ts      → Scan mutation + queue
│       │   │   └── scan.test.ts
│       │   │
│       │   └── export/
│       │       ├── ExportView.tsx   → Export buttons + download
│       │       ├── use-export.ts    → Export mutation hooks
│       │       └── export.test.ts
│       │
│       ├── shared/
│       │   ├── components/
│       │   │   ├── Layout.tsx       → App shell, navigation
│       │   │   ├── LoadingSpinner.tsx
│       │   │   ├── ErrorMessage.tsx
│       │   │   ├── ConfidenceBadge.tsx → High/medium/low indicator
│       │   │   └── PhotoThumbnail.tsx
│       │   ├── hooks/
│       │   │   └── use-online-status.ts
│       │   └── lib/
│       │       ├── api-client.ts    → Fetch wrapper with JWT + error handling
│       │       ├── indexed-db.ts    → IndexedDB schema + operations
│       │       ├── query-client.ts  → TanStack Query config
│       │       └── constants.ts     → Confidence thresholds, etc.
│       │
│       └── types/
│           └── index.ts             → Shared TypeScript types
│
├── server/
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts                → Express app entry + static file serving
│       ├── config.ts                → Environment variable loading
│       │
│       ├── routes/
│       │   ├── auth.ts              → POST /api/auth/login
│       │   ├── sessions.ts          → CRUD /api/sessions
│       │   ├── scans.ts             → POST /api/sessions/:id/scans
│       │   ├── object-types.ts      → GET /api/object-types
│       │   ├── exports.ts           → GET /api/sessions/:id/export/heli, /export/report
│       │   └── health.ts            → GET /api/health
│       │
│       ├── services/
│       │   ├── ai-classifier.ts     → OpenAI Vision API integration
│       │   ├── export-heli.ts       → 29-column Excel generation (exceljs)
│       │   ├── export-report.ts     → Bilingual PDF generation
│       │   ├── storage.ts           → Photo storage abstraction (filesystem now, S3 later)
│       │   └── queue.ts             → PostgreSQL job queue polling worker
│       │
│       ├── middleware/
│       │   ├── auth.ts              → JWT verification middleware
│       │   ├── error-handler.ts     → Global error handler
│       │   ├── upload.ts            → Multer config for photo upload
│       │   └── validate.ts          → Zod request validation
│       │
│       └── lib/
│           ├── prisma.ts            → Prisma client singleton
│           ├── logger.ts            → Pino logger setup
│           └── jwt.ts               → JWT sign/verify helpers
│
├── prisma/
│   ├── schema.prisma               → Database schema
│   ├── migrations/                  → Version-controlled migrations
│   └── seed.ts                      → 39 object types + 12 building types + test inspector
│
└── shared/
    └── types.ts                     → Types shared between client and server
```

### Architectural Boundaries

**API Boundaries:**
- All client-server communication through `/api/*` REST endpoints
- Frontend never accesses database directly
- Frontend never contacts OpenAI directly — all AI calls proxied through `/api/sessions/:id/scans`
- JWT token required for all `/api/*` endpoints except `/api/auth/login` and `/api/health`

**Component Boundaries:**
- Features are self-contained: each feature folder owns its components, hooks, and tests
- `shared/` contains only truly reusable components used by 2+ features
- No cross-feature imports between feature folders — communicate via API/query cache
- `shared/lib/api-client.ts` is the single point of contact with the server

**Service Boundaries:**
- `services/` are pure business logic — no Express req/res knowledge
- `routes/` handle HTTP concerns (parsing, validation, response formatting) and delegate to services
- `middleware/` handles cross-cutting HTTP concerns (auth, errors, uploads)
- `services/storage.ts` exposes interface — implementations swappable (filesystem → S3)

**Data Boundaries:**
- Prisma is the only database access layer — no raw SQL
- `server/lib/prisma.ts` exports single Prisma client instance
- Database types flow: `schema.prisma` → generated Prisma types → service layer → route serialization → API response
- `shared/types.ts` defines API contract types used by both client and server

### Requirements to Structure Mapping

| FR Group | Frontend | Backend | Database Model |
|---|---|---|---|
| FR1-FR5 (Sessions) | `features/sessions/` | `routes/sessions.ts` | `InventorySession` |
| FR6-FR12 (Scanning) | `features/scan/` | `routes/scans.ts` + `services/ai-classifier.ts` + `services/queue.ts` + `services/storage.ts` | `ScanRecord`, `ScanJob` |
| FR13-FR15 (Object Types) | — | `routes/object-types.ts` + `prisma/seed.ts` | `ObjectType`, `BuildingType` |
| FR16-FR19 (Heli OM) | `features/export/` | `routes/exports.ts` + `services/export-heli.ts` | — |
| FR20-FR23 (Client Report) | `features/export/` | `routes/exports.ts` + `services/export-report.ts` | — |
| FR24-FR28 (Auth & Integrity) | `features/auth/` | `routes/auth.ts` + `middleware/auth.ts` | `Inspector` |

**Cross-Cutting: Background Queue**
- `server/src/services/queue.ts` — polls `scan_jobs` table, processes photo → AI → store result
- Touched by: scan upload, AI classification, storage, error handling

**Cross-Cutting: Local Persistence**
- `client/src/shared/lib/indexed-db.ts` — mirrors key server models locally
- Touched by: scan flow, session management, online status detection

### Data Flow

```
Inspector → CameraView → photo blob
  → use-scan mutation → POST /api/sessions/:id/scans (multipart)
    → multer saves photo to /data/photos
    → creates ScanRecord (status: pending)
    → creates ScanJob (status: pending)
    → returns { data: scanRecord } immediately

Queue worker (polling):
  → picks up ScanJob
  → reads photo from storage
  → sends to OpenAI Vision API
  → receives classification + confidence
  → updates ScanRecord with AI result
  → updates ScanJob status to done

Inspector sees:
  → TanStack Query refetches scan → shows AI suggestion
  → Inspector confirms/corrects → PATCH /api/scans/:id
  → ScanRecord updated with final classification

Export:
  → GET /api/sessions/:id/export/heli
  → export-heli.ts reads all confirmed ScanRecords
  → maps to 29-column Excel → streams .xlsx file

  → GET /api/sessions/:id/export/report
  → export-report.ts reads ScanRecords + photos
  → generates bilingual PDF → streams file
```

### Deployment Structure

```dockerfile
# Multi-stage Dockerfile
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/ .
RUN npm ci && npm run build

FROM node:22-alpine AS server-build
WORKDIR /app/server
COPY server/ .
COPY prisma/ ../prisma/
RUN npm ci && npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=client-build /app/client/dist ./public
COPY --from=server-build /app/server/dist ./server
COPY prisma/ ./prisma/
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "server/server.js"]
```

Express serves `/public` as static files (Vite build output) and `/api/*` as API routes.

## Architecture Validation Results

### Gap Resolutions

**Gap 1 — Virtualized List:** `@tanstack/react-virtual` v3.13
- `useVirtualizer` hook in `SessionDetail.tsx` for scan record list
- Activates for sessions with 100+ objects, renders only visible items
- Ensures 60fps scroll at 2,000 items (NFR requirement)

**Gap 2 — Database Schema:**

```prisma
model Inspector {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String    @map("password_hash")
  name         String
  role         String    @default("inspector")
  createdAt    DateTime  @default(now()) @map("created_at")
  sessions     InventorySession[]
  scanRecords  ScanRecord[]
  @@map("inspectors")
}

model BuildingType {
  id       String    @id @default(cuid())
  nameNl   String    @map("name_nl")
  nameFr   String    @map("name_fr")
  active   Boolean   @default(true)
  sessions InventorySession[]
  objectTypes ObjectTypeBuildingType[]
  @@map("building_types")
}

model ObjectType {
  id              String    @id @default(cuid())
  nameNl          String    @map("name_nl")
  nameFr          String    @map("name_fr")
  heliOmCategory  String    @map("heli_om_category")
  active          Boolean   @default(true)
  buildingTypes   ObjectTypeBuildingType[]
  scanRecords     ScanRecord[]
  @@map("object_types")
}

model ObjectTypeBuildingType {
  objectTypeId   String     @map("object_type_id")
  buildingTypeId String     @map("building_type_id")
  objectType     ObjectType   @relation(fields: [objectTypeId], references: [id])
  buildingType   BuildingType @relation(fields: [buildingTypeId], references: [id])
  @@id([objectTypeId, buildingTypeId])
  @@map("object_type_building_types")
}

model InventorySession {
  id             String    @id @default(cuid())
  inspectorId    String    @map("inspector_id")
  clientAddress  String    @map("client_address")
  buildingTypeId String    @map("building_type_id")
  status         String    @default("active")
  createdAt      DateTime  @default(now()) @map("created_at")
  completedAt    DateTime? @map("completed_at")
  inspector      Inspector    @relation(fields: [inspectorId], references: [id])
  buildingType   BuildingType @relation(fields: [buildingTypeId], references: [id])
  scanRecords    ScanRecord[]
  @@map("inventory_sessions")
}

model ScanRecord {
  id                String      @id @default(cuid())
  sessionId         String      @map("session_id")
  inspectorId       String      @map("inspector_id")
  photoPath         String      @map("photo_path")
  aiProposedTypeId  String?     @map("ai_proposed_type_id")
  aiConfidence      Float?      @map("ai_confidence")
  aiRawResponse     String?     @map("ai_raw_response")
  confirmedTypeId   String?     @map("confirmed_type_id")
  status            String      @default("pending")
  createdAt         DateTime    @default(now()) @map("created_at")
  confirmedAt       DateTime?   @map("confirmed_at")
  session           InventorySession @relation(fields: [sessionId], references: [id])
  inspector         Inspector        @relation(fields: [inspectorId], references: [id])
  confirmedType     ObjectType?      @relation(fields: [confirmedTypeId], references: [id])
  scanJob           ScanJob?
  @@map("scan_records")
}

model ScanJob {
  id            String    @id @default(cuid())
  scanRecordId  String    @unique @map("scan_record_id")
  status        String    @default("pending")
  attempts      Int       @default(0)
  lastError     String?   @map("last_error")
  createdAt     DateTime  @default(now()) @map("created_at")
  processedAt   DateTime? @map("processed_at")
  scanRecord    ScanRecord @relation(fields: [scanRecordId], references: [id])
  @@map("scan_jobs")
}
```

7 models: Inspector, BuildingType, ObjectType, ObjectTypeBuildingType (many-to-many), InventorySession, ScanRecord, ScanJob. All snake_case in DB via `@map`, camelCase in TypeScript.

**Gap 3 — OpenAI Vision Prompt Strategy:**

System prompt dynamically built from ObjectType registry:
```
You are a fire safety and building inspection object classifier.
Given a photo of an object in a building, classify it as one of the following types.
Return ONLY a JSON response: { "typeId": "<id>", "confidence": <0.0-1.0>, "candidates": [{"typeId": "<id>", "confidence": <0.0-1.0>}] }

Available object types:
- <id>: <nameNl> (<nameFr>)
[... all active object types ...]

Building context: <buildingType.nameNl>

Rules:
- confidence >= 0.85: high (single suggestion)
- confidence 0.5-0.84: medium (top 3 candidates)
- confidence < 0.5: low (top 5 candidates or empty)
- Always return best match even at low confidence
```

Confidence thresholds as constants:
- `HIGH_CONFIDENCE_THRESHOLD = 0.85` → one-tap confirm (FR8)
- `MEDIUM_CONFIDENCE_THRESHOLD = 0.50` → selection menu (FR9)
- Below 0.50 → full object type list fallback (FR10)

Prompt is data-driven: new object types added to DB automatically appear in AI prompts.

**Gap 4 — PDF Library:** `@react-pdf/renderer`
- Server-side rendering via `renderToBuffer()` in Node.js
- No headless browser needed — lighter Docker image
- Client report as React component rendered to PDF:
  ```typescript
  const pdfBuffer = await renderToBuffer(
    <ClientReport session={session} scans={scans} />
  );
  ```
- Supports bilingual layout (NL + FR sections), embedded photos, tables

**Gap 5 — Frontend i18n:**
- Pilot: Hardcoded Dutch UI (inspectors are Dutch-speaking)
- Bilingual requirement applies to **exports only** (client report PDF contains NL + FR)
- Export service reads NL/FR labels from ObjectType table
- Phase 2+: Add `react-i18next` if UI needs French localization

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible and version-verified:
- Vite 8 + React 19 + TypeScript ✓
- Express 5 + Prisma 7.5 + PostgreSQL ✓
- TanStack Query + TanStack Virtual (same ecosystem) ✓
- @react-pdf/renderer in Node.js (no browser dependency) ✓
- @vite-pwa targets Vite 7 but compatible with Vite 8 ✓

**Pattern Consistency:**
- snake_case DB ↔ camelCase TS via Prisma @map throughout ✓
- REST endpoints kebab-case, JSON camelCase consistently ✓
- Feature-based structure maps 1:1 to FR categories ✓
- API response wrappers { data } / { error } in all routes ✓

**Structure Alignment:**
- Monorepo /client + /server + /prisma supports single Docker container ✓
- Service boundary clean: routes → services → Prisma ✓
- Storage abstraction enables filesystem → S3 migration ✓

### Requirements Coverage Validation ✅

**Functional Requirements:** 28/28 FRs covered
- Session Management (FR1-5): InventorySession model + CRUD routes + session components ✓
- Scanning (FR6-12): ScanRecord model + camera hook + AI classifier + queue ✓
- Object Types (FR13-15): ObjectType + BuildingType models + seed data + filtering ✓
- Heli OM Export (FR16-19): export-heli.ts with exceljs + 29-column mapping ✓
- Client Report (FR20-23): export-report.ts with @react-pdf/renderer + bilingual + photos ✓
- Auth & Integrity (FR24-28): Inspector model + JWT + audit fields on ScanRecord ✓

**Non-Functional Requirements:**
- Performance: Background queue (never blocks), TanStack Virtual (60fps at 2000 items) ✓
- Security: JWT, CORS, server-side API keys, HTTPS ✓
- Reliability: IndexedDB local persistence, PostgreSQL queue with retry, session restore ✓
- Scalability: ~30 users on single Docker container, persistent volume for photos ✓
- Deployment: Multi-stage Dockerfile, Easypanel, environment variables ✓

### Implementation Readiness Validation ✅

**Decision Completeness:** All critical decisions documented with versions ✓
**Structure Completeness:** Full directory tree with every file specified ✓
**Pattern Completeness:** Naming, structure, format, communication, process patterns all defined ✓
**Schema Completeness:** 7 Prisma models with all fields, relations, and mappings ✓
**AI Strategy Completeness:** Prompt structure, confidence thresholds, response format defined ✓

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (high — AI + dual-export + configurable data)
- [x] Technical constraints identified (iPad Safari, solo dev, 1-week pilot)
- [x] Cross-cutting concerns mapped (bilingual, audit trail, background processing, local persistence)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Full tech stack specified (Vite 8, React 19, Express 5, Prisma 7.5, PostgreSQL, TanStack Query, TanStack Virtual)
- [x] Integration patterns defined (REST, PostgreSQL queue, storage abstraction)
- [x] Performance considerations addressed (background queue, virtualized lists, caching)

**✅ Implementation Patterns**
- [x] Naming conventions established (DB snake_case, TS camelCase, components PascalCase)
- [x] Structure patterns defined (feature-based, co-located tests)
- [x] Communication patterns specified (TanStack Query, API wrappers, error handling)
- [x] Process patterns documented (loading states, error recovery, validation)

**✅ Project Structure**
- [x] Complete directory structure defined with all files
- [x] Component boundaries established (features, shared, services, middleware)
- [x] Integration points mapped (API boundaries, data flow, queue worker)
- [x] Requirements to structure mapping complete (FR → file mapping table)

**✅ Database Schema**
- [x] All 7 models defined with fields, types, and relations
- [x] Prisma @map conventions for snake_case DB columns
- [x] Seed data strategy for 39 object types + 12 building types

**✅ AI Integration**
- [x] Prompt strategy defined with dynamic object type loading
- [x] Confidence thresholds established (0.85 high, 0.50 medium)
- [x] Response format specified (JSON with typeId + confidence + candidates)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Single Docker container minimizes operational complexity for solo developer
- PostgreSQL-as-queue eliminates need for additional infrastructure
- Storage abstraction layer future-proofs photo storage migration
- TanStack ecosystem (Query + Virtual) provides consistent DX
- Data-driven AI prompts adapt to new object types without code changes
- Feature-based structure maps cleanly to PRD functional requirements

**Areas for Future Enhancement:**
- S3-compatible storage migration (Phase 2)
- Redis-based queue if PostgreSQL polling becomes bottleneck (unlikely at 30 users)
- react-i18next for French UI localization (Phase 2+)
- Multi-container deployment with Nginx reverse proxy (if scaling needed)
- Comprehensive E2E test suite with Playwright (post-pilot)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Use the Prisma schema as defined — do not add or modify models without explicit instruction
- Follow the API response format `{ data }` / `{ error }` everywhere
- Use TanStack Query for all server state — never raw fetch in components
- Refer to this document for all architectural questions

**First Implementation Priority:**
1. `npm create @vite-pwa/pwa@latest inventarispoq -- --template react-ts`
2. Set up monorepo structure (client/ + server/ + prisma/ + shared/)
3. `npx prisma init` + schema + first migration
4. Express server with health check endpoint
5. Docker compose for local dev with PostgreSQL
