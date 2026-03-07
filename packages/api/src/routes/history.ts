import { FastifyInstance } from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, gte, lt, lte, sql as drizzleSql } from 'drizzle-orm';
import { feedEntries, cats, foods, weightEntries, dayNotes } from '../db/schema';

export async function historyRoutes(fastify: FastifyInstance) {
  const sqlClient = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sqlClient);

  // GET /api/history/daily?catId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
  fastify.get<{ Querystring: { catId: string; from: string; to: string } }>(
    '/history/daily',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['catId', 'from', 'to'],
          properties: {
            catId: { type: 'string', format: 'uuid' },
            from: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            to: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
        },
      },
    },
    async (req, reply) => {
      const { catId, from, to } = req.query;

      const [cat] = await db.select().from(cats).where(eq(cats.id, catId));
      if (!cat) return reply.code(404).send({ error: 'Cat not found' });

      const fromDate = new Date(`${from}T00:00:00.000Z`);
      const toDateExclusive = new Date(`${to}T23:59:59.999Z`);

      // Aggregate feed entries by date and food category
      const rows = await db
        .select({
          date: drizzleSql<string>`DATE(${feedEntries.datetime})`.as('date'),
          category: foods.category,
          kcal: drizzleSql<string>`SUM(${feedEntries.kcalCalculated})`.as('kcal'),
          grams: drizzleSql<string>`SUM(${feedEntries.grams})`.as('grams'),
        })
        .from(feedEntries)
        .leftJoin(foods, eq(feedEntries.foodId, foods.id))
        .where(
          and(
            eq(feedEntries.catId, catId),
            gte(feedEntries.datetime, fromDate),
            lt(feedEntries.datetime, new Date(toDateExclusive.getTime() + 1)),
          ),
        )
        .groupBy(drizzleSql`DATE(${feedEntries.datetime})`, foods.category)
        .orderBy(drizzleSql`DATE(${feedEntries.datetime})`);

      // Weight entries in range
      const weights = await db
        .select({
          date: weightEntries.date,
          weightKg: weightEntries.weightKg,
        })
        .from(weightEntries)
        .where(
          and(
            eq(weightEntries.catId, catId),
            gte(weightEntries.date, from),
            lte(weightEntries.date, to),
          ),
        )
        .orderBy(weightEntries.date);

      // Day notes in range
      const notesRows = await db
        .select({
          date: dayNotes.date,
          content: dayNotes.content,
        })
        .from(dayNotes)
        .where(
          and(
            eq(dayNotes.catId, catId),
            gte(dayNotes.date, from),
            lte(dayNotes.date, to),
          ),
        )
        .orderBy(dayNotes.date);

      const notes: Record<string, string> = {};
      for (const n of notesRows) {
        if (n.content) notes[n.date] = n.content;
      }

      // Build day map with all dates in range (fill gaps)
      const dayMap = new Map<string, { category: string; kcal: number; grams: number }[]>();

      const current = new Date(`${from}T12:00:00Z`);
      const end = new Date(`${to}T12:00:00Z`);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        dayMap.set(dateStr, []);
        current.setDate(current.getDate() + 1);
      }

      // Fill actual data
      for (const row of rows) {
        const dateStr = typeof row.date === 'string' ? row.date : String(row.date);
        // Normalize date format (may come as YYYY-MM-DD or Date object)
        const normalizedDate = dateStr.substring(0, 10);
        const existing = dayMap.get(normalizedDate) ?? [];
        existing.push({
          category: row.category ?? 'KIBBLE',
          kcal: parseFloat(row.kcal) || 0,
          grams: parseFloat(row.grams) || 0,
        });
        dayMap.set(normalizedDate, existing);
      }

      const days = Array.from(dayMap.entries()).map(([date, categories]) => {
        const totalKcal = Math.round(categories.reduce((s, c) => s + c.kcal, 0) * 10) / 10;
        const totalGrams = Math.round(categories.reduce((s, c) => s + c.grams, 0) * 10) / 10;
        return { date, categories, totalKcal, totalGrams };
      });

      return reply.send({
        catId,
        from,
        to,
        dailyKcalTarget: cat.dailyKcalTarget,
        targetWeightKg: cat.targetWeightKg ? parseFloat(cat.targetWeightKg) : null,
        days,
        weights: weights.map((w) => ({
          date: w.date,
          weightKg: parseFloat(w.weightKg),
        })),
        notes,
      });
    },
  );
}
