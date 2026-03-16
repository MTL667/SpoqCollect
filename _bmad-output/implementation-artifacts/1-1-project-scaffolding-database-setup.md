# Story 1.1: Project Scaffolding & Database Setup

Status: ready-for-dev

## Story

As a developer,
I want a fully configured monorepo with database connectivity,
so that all subsequent features have a solid technical foundation to build on.

## Acceptance Criteria

1. Monorepo compiles successfully with TypeScript strict mode: `/client` (Vite React SPA), `/server` (Express API), `/prisma` (schema + migrations), `/shared` (types)
2. Running `npx prisma migrate dev` creates all 7 models: Inspector, BuildingType, ObjectType, ObjectTypeBuildingType, InventorySession, ScanRecord, ScanJob
3. All DB columns use snake_case mapping via `@map` / `@@map`
4. All relations and indexes are correctly established
5. `GET /api/health` returns `{ "data": { "status": "ok", "database": "connected" } }` with HTTP 200
6. Express serves static files from `/public` (client build output) and API from `/api/*`
7. `.env.example` documents all required environment variables
8. `docker-compose.yml` provides local dev PostgreSQL

## Tasks / Subtasks

- [ ] Task 1: Project initialization and monorepo structure (AC: #1)
  - [ ] Initialize root `package.json` with workspaces for `client`, `server`, `shared`
  - [ ] Scaffold client with Vite 8 + React 19 + TypeScript + @vite-pwa plugin + Tailwind CSS 4
  - [ ] Scaffold server with Express 5 + TypeScript (tsx for dev, tsup for build)
  - [ ] Create shared/types.ts with API contract types
  - [ ] Configure TypeScript strict mode in all tsconfig.json files
  - [ ] Add `.env.example` and `.gitignore`
- [ ] Task 2: Prisma schema and database setup (AC: #2, #3, #4)
  - [ ] Run `npx prisma init` in project root
  - [ ] Write complete `schema.prisma` with all 7 models (exact schema from architecture)
  - [ ] Run `npx prisma migrate dev --name init` to create initial migration
  - [ ] Verify generated TypeScript types match expected camelCase fields
- [ ] Task 3: Express server with health endpoint (AC: #5, #6)
  - [ ] Create `server/src/server.ts` Express app entry
  - [ ] Create `server/src/config.ts` environment variable loading
  - [ ] Create `server/src/lib/prisma.ts` Prisma client singleton
  - [ ] Create `server/src/lib/logger.ts` Pino logger setup
  - [ ] Create `server/src/routes/health.ts` with DB connectivity check
  - [ ] Create `server/src/middleware/error-handler.ts` global error handler
  - [ ] Configure Express to serve `./public` static files in production
  - [ ] Configure CORS middleware
- [ ] Task 4: Docker Compose for local dev (AC: #8)
  - [ ] Create `docker-compose.yml` with PostgreSQL service
  - [ ] Verify application connects and migrations run
- [ ] Task 5: Build and verify (AC: #1)
  - [ ] Verify `npm run build` compiles both client and server
  - [ ] Verify `npm run dev` starts both Vite dev server and Express with HMR

## Dev Notes

### Critical Architecture Constraints

**Tech Stack — Exact Versions:**
| Layer | Technology | Version |
|---|---|---|
| Frontend | Vite + React + TypeScript | Vite 8.0, React 19 |
| Styling | Tailwind CSS | 4.x |
| PWA | @vite-pwa plugin (vite-plugin-pwa) | latest |
| Backend | Express + TypeScript | 5.2.x |
| ORM | Prisma | 7.5.x |
| Database | PostgreSQL | 16+ |
| Logging | Pino | latest |

**Important:** `@vite-pwa/create-pwa` v1.1.0 still scaffolds with Vite 7. Do NOT use the `npm create @vite-pwa/pwa@latest` command. Instead, manually set up Vite 8 with `vite-plugin-pwa` as a plugin in `vite.config.ts`.

### Prisma Schema — Use Exactly As Defined

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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

### Project Directory Structure — This Story Creates

```
inventarispoq/
├── README.md
├── package.json                    → Workspaces: [client, server, shared]
├── tsconfig.json                   → Base config, strict: true
├── .env.example
├── .env
├── .gitignore
├── docker-compose.yml              → PostgreSQL for local dev
│
├── client/
│   ├── index.html
│   ├── vite.config.ts              → vite-plugin-pwa config
│   ├── tsconfig.json               → extends root, strict
│   ├── package.json
│   ├── public/
│   │   ├── manifest.json           → PWA manifest
│   │   └── favicon.ico
│   └── src/
│       ├── main.tsx                → App entry
│       ├── App.tsx                 → Placeholder routes
│       └── index.css               → Tailwind imports
│
├── server/
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── server.ts               → Express app entry + static serving
│       ├── config.ts               → env var loading
│       ├── routes/
│       │   └── health.ts           → GET /api/health
│       ├── middleware/
│       │   └── error-handler.ts    → Global error handler
│       └── lib/
│           ├── prisma.ts           → Prisma client singleton
│           └── logger.ts           → Pino logger setup
│
├── prisma/
│   ├── schema.prisma               → All 7 models
│   └── migrations/                 → Initial migration
│
└── shared/
    └── types.ts                    → API contract types
```

### Naming Conventions — Follow Exactly

- **DB tables:** snake_case, plural (`inventory_sessions`, `scan_records`)
- **DB columns:** snake_case (`object_type_id`, `created_at`)
- **TypeScript:** camelCase variables/functions (`sessionId`, `getObjectTypes()`)
- **React components:** PascalCase files and exports (`ScanFlow.tsx`)
- **Non-component files:** kebab-case (`auth-middleware.ts`, `api-client.ts`)
- **Hooks:** `use-` prefix filename, `use` prefix export (`use-camera.ts` → `useCamera()`)
- **API endpoints:** kebab-case, plural (`/api/sessions`, `/api/object-types`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_PHOTO_SIZE`)

### API Response Format — All Endpoints Must Use

```typescript
// Success
{ data: T }

// Error
{ error: { code: string, message: string } }
```

### Environment Variables (.env.example)

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inventarispoq
JWT_SECRET=change-me-in-production
OPENAI_API_KEY=sk-your-key-here
STORAGE_PATH=./data/photos
NODE_ENV=development
PORT=3000
```

### Server Entry Pattern

Express serves dual purpose:
1. API routes at `/api/*`
2. Static files from `./public` (Vite build output) in production
3. In dev, Vite dev server runs separately on its own port

```typescript
// server/src/server.ts pattern
import express from 'express';
import cors from 'cors';
import path from 'path';
import { healthRouter } from './routes/health.js';
import { errorHandler } from './middleware/error-handler.js';
import { config } from './config.js';
import { logger } from './lib/logger.js';

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/health', healthRouter);

// Serve static files in production
if (config.NODE_ENV === 'production') {
  app.use(express.static(path.join(import.meta.dirname, '../public')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(import.meta.dirname, '../public/index.html'));
  });
}

// Error handler (must be last)
app.use(errorHandler);

app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`);
});
```

### Prisma Client Singleton

```typescript
// server/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Docker Compose for Local Dev

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: inventarispoq
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Anti-Patterns to Avoid

- **DO NOT** use `npm create @vite-pwa/pwa@latest` — it scaffolds Vite 7. Set up Vite 8 manually.
- **DO NOT** create separate package.json per workspace unless npm workspaces require it. Use root package.json workspaces.
- **DO NOT** use `any` type anywhere. TypeScript strict mode, no exceptions.
- **DO NOT** use raw `fetch` in client components — TanStack Query will be added in later stories.
- **DO NOT** add seed data in this story — that's Story 1.2.
- **DO NOT** add auth middleware in this story — that's Story 1.3.
- **DO NOT** create the Dockerfile in this story — that's Story 1.4.
- **DO NOT** install libraries not needed for this story (exceljs, @react-pdf/renderer, @tanstack/react-query, etc.)

### Dependencies to Install (This Story Only)

**Root / Server:**
- `express` (5.x)
- `cors`
- `pino` + `pino-pretty` (dev)
- `@prisma/client` + `prisma` (dev)
- `typescript` + `tsx` (dev) + `tsup` (dev)
- `@types/express` + `@types/cors` (dev)

**Client:**
- `react` + `react-dom` (19.x)
- `vite` (8.x) + `@vitejs/plugin-react`
- `vite-plugin-pwa`
- `tailwindcss` (4.x)
- `typescript`

### Project Structure Notes

- Monorepo with npm workspaces: `"workspaces": ["client", "server", "shared"]`
- Root `tsconfig.json` is base config only — each workspace extends it
- `shared/types.ts` exports API contract types used by both client and server
- Prisma directory at project root (not inside server) for shared access

### References

- [Source: architecture.md#Selected Starter] — Vite + React + Express monorepo rationale
- [Source: architecture.md#Core Architectural Decisions] — Data architecture, logging, env vars
- [Source: architecture.md#Implementation Patterns] — Naming conventions, structure patterns, API formats
- [Source: architecture.md#Complete Project Directory Structure] — Full directory tree
- [Source: architecture.md#Gap 2 — Database Schema] — Exact Prisma schema with all 7 models
- [Source: architecture.md#Deployment Structure] — Multi-stage Dockerfile pattern (for Story 1.4)
- [Source: epics.md#Story 1.1] — Acceptance criteria

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
