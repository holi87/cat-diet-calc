import type { FastifyInstance } from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export function createDbClient(fastify: FastifyInstance) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const sql = postgres(databaseUrl, { max: 1 });
  fastify.addHook('onClose', async () => {
    await sql.end({ timeout: 5 });
  });

  return drizzle(sql);
}
