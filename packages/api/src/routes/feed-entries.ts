import { FastifyInstance } from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { feedEntries, foods } from '../db/schema';
import { calculateKcal } from '../lib/calc';

export async function feedEntriesRoutes(fastify: FastifyInstance) {
  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  // POST /api/feed-entries
  fastify.post<{
    Body: {
      catId: string;
      foodId: string;
      grams: number;
      datetime?: string;
      note?: string;
    };
  }>(
    '/feed-entries',
    {
      schema: {
        body: {
          type: 'object',
          required: ['catId', 'foodId', 'grams'],
          properties: {
            catId: { type: 'string', format: 'uuid' },
            foodId: { type: 'string', format: 'uuid' },
            grams: { type: 'number', minimum: 0.1 },
            datetime: { type: 'string' },
            note: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const { catId, foodId, grams, datetime, note } = req.body;

      const [food] = await db.select().from(foods).where(eq(foods.id, foodId));
      if (!food) return reply.code(404).send({ error: 'Food not found' });

      const kcalCalculated = calculateKcal(grams, parseFloat(food.kcalPer100g));

      const [entry] = await db
        .insert(feedEntries)
        .values({
          catId,
          foodId,
          grams: String(grams),
          kcalCalculated: String(kcalCalculated),
          datetime: datetime ? new Date(datetime) : new Date(),
          note: note ?? null,
        })
        .returning();

      return reply.code(201).send(entry);
    },
  );

  // DELETE /api/feed-entries/:id
  fastify.delete<{ Params: { id: string } }>(
    '/feed-entries/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
      },
    },
    async (req, reply) => {
      const [entry] = await db
        .delete(feedEntries)
        .where(eq(feedEntries.id, req.params.id))
        .returning();
      if (!entry) return reply.code(404).send({ error: 'Entry not found' });
      return reply.send({ success: true });
    },
  );
}
