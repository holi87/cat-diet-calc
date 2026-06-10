import { FastifyInstance } from 'fastify';
import { eq, and, gte, lt } from 'drizzle-orm';
import { feedEntries, cats, foods } from '../db/schema';
import { createDbClient } from '../db/client';
import { zonedDayRange } from '../lib/dates';

export async function daySummaryRoutes(fastify: FastifyInstance) {
  const db = createDbClient(fastify);

  // GET /api/day-summary?catId=...&date=YYYY-MM-DD
  fastify.get<{ Querystring: { catId: string; date: string } }>(
    '/day-summary',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['catId', 'date'],
          properties: {
            catId: { type: 'string', format: 'uuid' },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
        },
      },
    },
    async (req, reply) => {
      const { catId, date } = req.query;

      const [cat] = await db.select().from(cats).where(eq(cats.id, catId));
      if (!cat) return reply.code(404).send({ error: 'Cat not found' });

      const { start: dayStart, end: dayEnd } = zonedDayRange(date);

      const entries = await db
        .select({
          id: feedEntries.id,
          catId: feedEntries.catId,
          datetime: feedEntries.datetime,
          foodId: feedEntries.foodId,
          foodName: foods.name,
          foodCategory: foods.category,
          foodUnit: foods.unit,
          grams: feedEntries.grams,
          pieces: feedEntries.pieces,
          kcalCalculated: feedEntries.kcalCalculated,
          note: feedEntries.note,
          createdAt: feedEntries.createdAt,
        })
        .from(feedEntries)
        .leftJoin(foods, eq(feedEntries.foodId, foods.id))
        .where(
          and(
            eq(feedEntries.catId, catId),
            gte(feedEntries.datetime, dayStart),
            lt(feedEntries.datetime, dayEnd),
          ),
        )
        .orderBy(feedEntries.datetime);

      const totalKcal = entries.reduce(
        (sum, e) => sum + parseFloat(e.kcalCalculated),
        0,
      );
      const totalKcalRounded = Math.round(totalKcal * 10) / 10;

      return reply.send({
        catId,
        date,
        dailyKcalTarget: cat.dailyKcalTarget,
        entries,
        totalKcal: totalKcalRounded,
        remainingKcal: Math.round((cat.dailyKcalTarget - totalKcalRounded) * 10) / 10,
      });
    },
  );
}
