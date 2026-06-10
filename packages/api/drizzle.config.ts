import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // No credentials in the repo — pass DATABASE_URL when a command needs the DB
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5433/catcal',
  },
} satisfies Config;
