# Story 1.2: Seed Data & Object Type Registry

Status: ready-for-dev

## Story

As a developer,
I want the system pre-loaded with all 39 object types, 12 building types, and their applicability matrix,
so that inspectors have a complete registry available from day one.

## Acceptance Criteria

1. Running `npx prisma db seed` inserts 39 object types with both Dutch (`name_nl`) and French (`name_fr`) labels
2. 12 building types are inserted with both Dutch and French labels
3. The `object_type_building_types` junction table is populated with the correct applicability matrix (which object types apply to which building types)
4. One test inspector account is created (email: `test@inventarispoq.be`, known password hash)
5. `GET /api/object-types` returns all 39 object types with `id`, `nameNl`, `nameFr`, `heliOmCategory`, and `active` status in `{ "data": [...] }` format
6. `GET /api/building-types` returns all 12 building types with `id`, `nameNl`, and `nameFr` in `{ "data": [...] }` format
7. `GET /api/object-types?buildingTypeId={id}` returns only object types applicable to that building type
8. Seed script is idempotent (can be re-run without duplicating data)

## Tasks / Subtasks

- [ ] Task 1: Create seed script (AC: #1, #2, #3, #4, #8)
  - [ ] Create `prisma/seed.ts` with all seed data
  - [ ] Add 12 building types with NL + FR names
  - [ ] Add 39 object types with NL + FR names + heliOmCategory
  - [ ] Populate `object_type_building_types` junction table
  - [ ] Add test inspector with hashed password
  - [ ] Configure `prisma db seed` command in `package.json`
  - [ ] Make seed idempotent using `upsert` operations
- [ ] Task 2: Object types API endpoint (AC: #5, #7)
  - [ ] Create `server/src/routes/object-types.ts`
  - [ ] `GET /api/object-types` returns all active object types
  - [ ] `GET /api/object-types?buildingTypeId={id}` filters by building type via junction table
  - [ ] Register route in `server.ts`
- [ ] Task 3: Building types API endpoint (AC: #6)
  - [ ] Create `server/src/routes/building-types.ts`
  - [ ] `GET /api/building-types` returns all active building types
  - [ ] Register route in `server.ts`
- [ ] Task 4: Verify seed + API integration
  - [ ] Run seed, query both endpoints, confirm counts and data shape

## Dev Notes

### Previous Story Context (Story 1.1)

Story 1.1 created:
- Monorepo structure: `/client`, `/server`, `/prisma`, `/shared`
- Prisma schema with all 7 models (use as-is, do NOT modify)
- Express server with health endpoint at `/api/health`
- Prisma client singleton at `server/src/lib/prisma.ts`
- Pino logger at `server/src/lib/logger.ts`
- Error handler middleware at `server/src/middleware/error-handler.ts`
- Docker compose with PostgreSQL

### Seed Data — Building Types (12)

The 12 building types from the domain (source: `Upload all inventaris.xlsx`):

| # | name_nl | name_fr |
|---|---------|---------|
| 1 | Winkel/retail | Commerce/retail |
| 2 | Hotel | Hôtel |
| 3 | Appartement | Appartement |
| 4 | Garage/bandencentrale | Garage/centre de pneus |
| 5 | School | École |
| 6 | Zorg | Soins |
| 7 | Resto/café | Resto/café |
| 8 | Parking | Parking |
| 9 | Sportfaciliteit | Installation sportive |
| 10 | Kantoor | Bureau |
| 11 | Magazijn | Entrepôt |
| 12 | Evenementenhal | Salle événementielle |

### Seed Data — Object Types (39)

The 39 object types from the original domain template. Each has a Dutch name, French name, Heli OM category, and a matrix of applicable building types.

**IMPORTANT FOR DEV AGENT:** The complete list of 39 object types with their French translations and building type applicability matrix is domain-specific data that must be sourced from Kevin (project owner). The objects are fire safety and building inspection equipment including but not limited to:

- Brandblussers (types: ABC poeder, CO2, schuim, water) / Extincteurs
- Noodverlichting / Éclairage de secours
- Branddetectiecentrales / Centrales de détection incendie
- Rookmelders / Détecteurs de fumée
- Sprinklerinstallaties / Installations de sprinklers
- Branddeuren / Portes coupe-feu
- Evacuatieplannen / Plans d'évacuation
- Rookkoepels / Exutoires de fumée
- Liften / Ascenseurs
- Gasdetectie / Détection de gaz
- ATEX-installaties / Installations ATEX
- Persluchthouders / Réservoirs d'air comprimé
- Sectionaaldeuren / Portes sectionnelles
- Dockshelters / Dockshelters
- Heftrucks / Chariots élévateurs
- Brandkranen / Bornes d'incendie
- Droogstijgleidingen / Colonnes sèches
- Nooduitgangen / Sorties de secours
- Brandwerende wanden / Murs coupe-feu
- Blusleidingen / Conduites d'extinction
- ... (remaining types from domain template)

**The seed script must be structured so that adding/modifying object types is straightforward — each type defined as a clear data object in an array.**

### Seed Script Pattern

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt'; // or argon2

const prisma = new PrismaClient();

const buildingTypes = [
  { nameNl: 'Winkel/retail', nameFr: 'Commerce/retail' },
  { nameNl: 'Hotel', nameFr: 'Hôtel' },
  // ... all 12
];

const objectTypes = [
  {
    nameNl: 'Type brandblussers',
    nameFr: 'Extincteurs',
    heliOmCategory: 'BB',
    applicableBuildings: ['Winkel/retail', 'Hotel', 'Appartement', /* ... */],
  },
  // ... all 39
];

async function main() {
  // Upsert building types
  for (const bt of buildingTypes) {
    await prisma.buildingType.upsert({
      where: { /* use a unique constraint or findFirst */ },
      update: { nameFr: bt.nameFr },
      create: { nameNl: bt.nameNl, nameFr: bt.nameFr },
    });
  }

  // Upsert object types
  for (const ot of objectTypes) {
    const created = await prisma.objectType.upsert({
      where: { /* unique constraint */ },
      update: { nameFr: ot.nameFr, heliOmCategory: ot.heliOmCategory },
      create: {
        nameNl: ot.nameNl,
        nameFr: ot.nameFr,
        heliOmCategory: ot.heliOmCategory,
      },
    });

    // Link to building types
    for (const btName of ot.applicableBuildings) {
      const bt = await prisma.buildingType.findFirst({
        where: { nameNl: btName },
      });
      if (bt) {
        await prisma.objectTypeBuildingType.upsert({
          where: {
            objectTypeId_buildingTypeId: {
              objectTypeId: created.id,
              buildingTypeId: bt.id,
            },
          },
          update: {},
          create: {
            objectTypeId: created.id,
            buildingTypeId: bt.id,
          },
        });
      }
    }
  }

  // Test inspector
  const passwordHash = await hash('test1234', 10);
  await prisma.inspector.upsert({
    where: { email: 'test@inventarispoq.be' },
    update: {},
    create: {
      email: 'test@inventarispoq.be',
      name: 'Test Inspector',
      passwordHash,
      role: 'inspector',
    },
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Idempotency Strategy

The seed script MUST use `upsert` for all inserts so it can be re-run safely. However, note that the Prisma schema uses `cuid()` for IDs, and `ObjectType` has no unique constraint besides `id`. To enable upsert:

**Option A (Recommended):** Add a unique constraint on `name_nl` to the ObjectType and BuildingType models. This requires a schema migration.

**Option B:** Use `findFirst` + conditional create. Less elegant but avoids schema change.

**If choosing Option A**, add to schema.prisma:
```prisma
model ObjectType {
  // ... existing fields
  nameNl String @unique @map("name_nl")  // Add @unique
  // ...
}

model BuildingType {
  // ... existing fields  
  nameNl String @unique @map("name_nl")  // Add @unique
  // ...
}
```

This creates a new migration. This is acceptable because Story 1.1 established the initial schema, and Story 1.2 refines it for seed idempotency. Follow the DB creation principle: modify schema ONLY when the story needs it.

### API Route Patterns

Follow the patterns established in Story 1.1:

```typescript
// server/src/routes/object-types.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const objectTypesRouter = Router();

objectTypesRouter.get('/', async (req, res, next) => {
  try {
    const { buildingTypeId } = req.query;

    const where: any = { active: true };

    if (buildingTypeId) {
      where.buildingTypes = {
        some: { buildingTypeId: buildingTypeId as string },
      };
    }

    const objectTypes = await prisma.objectType.findMany({
      where,
      orderBy: { nameNl: 'asc' },
    });

    res.json({ data: objectTypes });
  } catch (error) {
    next(error);
  }
});
```

```typescript
// server/src/routes/building-types.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const buildingTypesRouter = Router();

buildingTypesRouter.get('/', async (_req, res, next) => {
  try {
    const buildingTypes = await prisma.buildingType.findMany({
      where: { active: true },
      orderBy: { nameNl: 'asc' },
    });

    res.json({ data: buildingTypes });
  } catch (error) {
    next(error);
  }
});
```

### Registration in server.ts

```typescript
// Add to server/src/server.ts
import { objectTypesRouter } from './routes/object-types.js';
import { buildingTypesRouter } from './routes/building-types.js';

app.use('/api/object-types', objectTypesRouter);
app.use('/api/building-types', buildingTypesRouter);
```

### Package.json Seed Configuration

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### Dependencies to Install (This Story Only)

- `bcrypt` (or `argon2`) for password hashing + `@types/bcrypt` (dev)
- No other new dependencies needed

### Anti-Patterns to Avoid

- **DO NOT** hardcode IDs — use `cuid()` auto-generation
- **DO NOT** add auth middleware to these endpoints yet — that's Story 1.3. These routes are unprotected for now
- **DO NOT** create frontend components — this story is backend/seed only
- **DO NOT** use `deleteMany` + `createMany` for seed — use `upsert` for idempotency
- **DO NOT** modify any models besides adding `@unique` to `nameNl` if needed for upsert
- **DO NOT** add seed data for scan records, sessions, or scan jobs — only reference data

### API Response Format Reminder

All endpoints MUST follow the architecture standard:

```typescript
// Success
{ data: T | T[] }

// Error
{ error: { code: string, message: string } }
```

### Naming Convention Reminder

- Route files: kebab-case (`object-types.ts`, `building-types.ts`)
- Endpoints: kebab-case, plural (`/api/object-types`, `/api/building-types`)
- Query params: camelCase (`?buildingTypeId=...`)
- Response fields: camelCase (Prisma auto-generates this)

### Project Structure Notes

Files created/modified in this story:
```
prisma/
  seed.ts                          → NEW: Seed script with all reference data
  schema.prisma                    → MODIFIED: Add @unique to nameNl (if Option A)
  migrations/                      → NEW migration (if schema changed)

server/src/
  routes/
    object-types.ts                → NEW: GET /api/object-types
    building-types.ts              → NEW: GET /api/building-types
  server.ts                        → MODIFIED: Register new routes

package.json                       → MODIFIED: Add prisma.seed config
```

### References

- [Source: architecture.md#Gap 2 — Database Schema] — All 7 Prisma models
- [Source: architecture.md#Implementation Patterns] — API response format, naming conventions
- [Source: architecture.md#Project Structure] — Route file locations
- [Source: epics.md#Story 1.2] — Acceptance criteria
- [Source: prd.md#Object Type Data Model] — FR13 registry requirements
- [Source: brainstorming-session] — 39 object types × 12 building types domain data

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
