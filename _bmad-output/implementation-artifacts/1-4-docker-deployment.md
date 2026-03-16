# Story 1.4: Docker Deployment & Health Check

Status: ready-for-dev

## Story

As a developer,
I want a containerized deployment setup,
So that the application can be deployed to Easypanel with a single Docker image.

## Acceptance Criteria

1. `docker compose up` starts PostgreSQL + app; migrations run; `GET /api/health` responds
2. Multi-stage Dockerfile: built client + server, no dev deps or TS source in final image
3. Environment variables configurable: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `PORT`
4. No secrets hardcoded in image

## Tasks / Subtasks

- [ ] Task 1: Multi-stage Dockerfile (AC: #2, #4)
  - [ ] Create `Dockerfile` at project root
  - [ ] Stage 1 (client-build): `node:22-alpine`, copy client, `npm ci && npm run build`
  - [ ] Stage 2 (server-build): `node:22-alpine`, copy server + prisma, `npm ci && npm run build`
  - [ ] Stage 3 (production): `node:22-alpine`, copy built client to `./public`, built server to `./server`, prisma schema
  - [ ] Run `npx prisma generate` in final stage (no migrations in image — run at startup)
  - [ ] `EXPOSE 3000`, `CMD` to start server
- [ ] Task 2: Update docker-compose.yml (AC: #1)
  - [ ] Add `app` service alongside existing `postgres` service
  - [ ] App depends on postgres
  - [ ] App uses build context (Dockerfile)
  - [ ] Pass env vars: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `PORT`
  - [ ] Map port 3000 for app
- [ ] Task 3: Entrypoint script (AC: #1)
  - [ ] Create entrypoint script that runs `npx prisma migrate deploy` then `node server/server.js`
  - [ ] Ensure migrations run before server start
  - [ ] Handle migration failures appropriately
- [ ] Task 4: .dockerignore (AC: #2, #4)
  - [ ] Create `.dockerignore` to exclude `node_modules`, `.env`, `.git`, dev artifacts
  - [ ] Exclude client `node_modules` and server `node_modules` from build context
  - [ ] Exclude unnecessary files (tests, docs, etc.)
- [ ] Task 5: Verify build and deployment (AC: #1, #3)
  - [ ] Run `docker compose build` successfully
  - [ ] Run `docker compose up` and verify PostgreSQL + app start
  - [ ] Verify `GET /api/health` returns 200 with `{ "data": { "status": "ok", "database": "connected" } }`
  - [ ] Verify env vars are read from compose (no hardcoded secrets)

## Dev Notes

### Previous Story Context (Story 1.1, 1.2, 1.3)

- Story 1.1: docker-compose with PostgreSQL, health endpoint at `/api/health`
- Story 1.2: Seed data, reference endpoints
- Story 1.3: JWT auth (auth middleware protects /api/* except login + health)

### Dockerfile Architecture

```dockerfile
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

**Note:** Entrypoint script (Task 3) should wrap the CMD to run migrations first. Adjust CMD/ENTRYPOINT as needed:

```dockerfile
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server/server.js"]
```

Or inline: `CMD ["sh", "-c", "npx prisma migrate deploy && node server/server.js"]`

### Photo Storage

- Persistent volume at `/data/photos` for photo storage (can be added to docker-compose for app service)
- Story 1.4 may defer volume mount if not yet used; document for future stories

### Docker Compose Enhancement

```yaml
services:
  postgres:
    # ... existing from 1.1

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/inventarispoq
      JWT_SECRET: ${JWT_SECRET:-change-me-in-production}
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      PORT: 3000
      NODE_ENV: production
    depends_on:
      - postgres
    volumes:
      - photo_storage:/data/photos   # Optional, for future scan storage
```

### .dockerignore Contents

```
node_modules
.git
.env
.env.*
*.log
dist
coverage
.vscode
.idea
__tests__
*.test.ts
*.spec.ts
```

### Dependencies

- None new — uses existing npm scripts and Prisma

### Anti-Patterns to Avoid

- **DO NOT** put secrets in Dockerfile or docker-compose (use env vars / .env)
- **DO NOT** include `node_modules` in final image — use `npm ci` in build stages, copy only `dist` and `public`
- **DO NOT** skip `prisma generate` in final stage — server needs Prisma client
- **DO NOT** run `prisma migrate dev` in Docker — use `prisma migrate deploy` for production

### File Structure Notes

Files created/modified in this story:

```
/
  Dockerfile                  → NEW: Multi-stage build
  docker-compose.yml          → MODIFIED: Add app service
  .dockerignore               → NEW: Exclude dev artifacts
  docker-entrypoint.sh        → NEW (optional): Migrate + start
```

### References

- [Source: epics.md#Story 1.4] — Acceptance criteria
- [Source: architecture.md#Deployment Structure] — Multi-stage Dockerfile pattern
- [Source: Story 1.1] — docker-compose PostgreSQL, health endpoint
- NFR17: Docker on Easypanel
- NFR18: Environment variables for config

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
