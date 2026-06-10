import type { FastifyInstance } from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// One shared pool for the whole process — every route plugin used to open its
// own single-connection pool (10 idle connections, queries serialized per route).
let sharedSql: ReturnType<typeof postgres> | null = null;

export function createDbClient(fastify: FastifyInstance) {
  if (!sharedSql) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is required');

    const sql = postgres(databaseUrl, { max: 5 });
    sharedSql = sql;
    fastify.addHook('onClose', async () => {
      await sql.end({ timeout: 5 });
      if (sharedSql === sql) sharedSql = null;
    });
  }

  return drizzle(sharedSql);
}
