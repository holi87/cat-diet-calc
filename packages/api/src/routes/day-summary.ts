import { FastifyInstance } from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, gte, lt, sql as drizzleSql } from 'drizzle-orm';
import { feedEntries, cats, foods } from '../db/schema';

export async function daySummaryRoutes(fastify: FastifyInstance) {
  const sqlClient = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sqlClient);

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

      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(`${date}T23:59:59.999Z`);

      const entries = await db
        .select({
          id: feedEntries.id,
          catId: feedEntries.catId,
          datetime: feedEntries.datetime,
          foodId: feedEntries.foodId,
          foodName: foods.name,
          foodCategory: foods.category,
          grams: feedEntries.grams,
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
            lt(feedEntries.datetime, new Date(dayEnd.getTime() + 1)),
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
