export const config = {
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
  STORAGE_PATH: process.env.STORAGE_PATH ?? './data/photos',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3000', 10),
} as const;
