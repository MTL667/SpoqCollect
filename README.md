# InventariSpoq

AI-powered fire safety inventory tool for iPad. Inspectors photograph objects, AI classifies them, and the system generates Heli OM Excel exports and bilingual client reports.

## Quick Start

```bash
# Start PostgreSQL
docker compose up postgres -d

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed data (39 object types, 12 building types, test inspector)
npx prisma db seed

# Start dev servers (client :5173, server :3000)
npm run dev
```

## Test Login

- Email: `test@inventarispoq.be`
- Password: `test1234`

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `OPENAI_API_KEY` | OpenAI API key for Vision classification |
| `STORAGE_PATH` | Photo storage directory |
| `PORT` | Server port (default 3000) |

## Production Deployment

```bash
docker compose up --build
```

The app runs at `http://localhost:3000` with auto-migration on startup.

## Tech Stack

- **Frontend:** React 19, Vite 7, Tailwind CSS 4, TanStack Query, PWA
- **Backend:** Express 5, TypeScript, Prisma 7.5, PostgreSQL, Pino
- **AI:** OpenAI Vision API (gpt-4o-mini)
- **Exports:** ExcelJS (Heli OM), @react-pdf/renderer (client report)
