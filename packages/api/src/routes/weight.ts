import { FastifyInstance } from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, desc } from 'drizzle-orm';
import { weightEntries, NewWeightEntry } from '../db/schema';

export async function weightRoutes(fastify: FastifyInstance) {
  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  // GET /api/weight-entries?catId=...
  fastify.get<{ Querystring: { catId: string } }>(
    '/weight-entries',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['catId'],
          properties: { catId: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (req, reply) => {
      const result = await db
        .select()
        .from(weightEntries)
        .where(eq(weightEntries.catId, req.query.catId))
        .orderBy(desc(weightEntries.date));
      return reply.send(result);
    },
  );

  // POST /api/weight-entries
  fastify.post<{
    Body: Pick<NewWeightEntry, 'catId' | 'date' | 'weightKg'> & { note?: string };
  }>(
    '/weight-entries',
    {
      schema: {
        body: {
          type: 'object',
          required: ['catId', 'date', 'weightKg'],
          properties: {
            catId: { type: 'string', format: 'uuid' },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            weightKg: { type: 'number', minimum: 0.1 },
            note: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const [entry] = await db
        .insert(weightEntries)
        .values({
          catId: req.body.catId,
          date: req.body.date,
          weightKg: String(req.body.weightKg),
          note: req.body.note ?? null,
        })
        .returning();
      return reply.code(201).send(entry);
    },
  );
}
