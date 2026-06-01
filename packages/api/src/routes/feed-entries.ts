import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { feedEntries, foods } from '../db/schema';
import { createDbClient } from '../db/client';
import { resolveFeedEntryAmount, type ResolvedFeedEntryAmount } from '../lib/feed-entry';

export async function feedEntriesRoutes(fastify: FastifyInstance) {
  const db = createDbClient(fastify);

  // POST /api/feed-entries
  fastify.post<{
    Body: {
      catId: string;
      foodId: string;
      grams?: number;
      pieces?: number;
      datetime?: string;
      note?: string;
    };
  }>(
    '/feed-entries',
    {
      schema: {
        body: {
          type: 'object',
          required: ['catId', 'foodId'],
          properties: {
            catId: { type: 'string', format: 'uuid' },
            foodId: { type: 'string', format: 'uuid' },
            grams: { type: 'number', minimum: 0.1 },
            pieces: { type: 'number', minimum: 0.01 },
            datetime: { type: 'string' },
            note: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const { catId, foodId, grams, pieces, datetime, note } = req.body;

      const [food] = await db.select().from(foods).where(eq(foods.id, foodId));
      if (!food) return reply.code(404).send({ error: 'Food not found' });

      let resolvedAmount: ResolvedFeedEntryAmount;
      try {
        resolvedAmount = resolveFeedEntryAmount(food, { grams, pieces });
      } catch (error) {
        return reply.code(400).send({ error: (error as Error).message });
      }

      const [entry] = await db
        .insert(feedEntries)
        .values({
          catId,
          foodId,
          grams: String(resolvedAmount.grams),
          pieces: resolvedAmount.pieces == null ? null : String(resolvedAmount.pieces),
          kcalCalculated: String(resolvedAmount.kcalCalculated),
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
