import { FastifyInstance } from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, gte, lt } from 'drizzle-orm';
import { feedEntries, cats, foods } from '../db/schema';
import { calculateCloseDay, calculateKcal } from '../lib/calc';

const STANDARD_KIBBLE_KCAL = 100; // 1g = 1 kcal

export async function closeDayRoutes(fastify: FastifyInstance) {
  const sqlClient = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sqlClient);

  const bodySchema = {
    type: 'object',
    required: ['catId', 'date'],
    properties: {
      catId: { type: 'string', format: 'uuid' },
      date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      meatFoodId: { type: 'string', format: 'uuid' },
      meatGrams: { type: 'number', minimum: 0 },
      kibbleFoodId: { type: 'string', format: 'uuid' },
    },
  };

  type CloseDayBody = {
    catId: string;
    date: string;
    meatFoodId?: string;
    meatGrams?: number;
    kibbleFoodId?: string;
  };

  async function computeCloseDay(body: CloseDayBody) {
    const { catId, date, meatFoodId, meatGrams = 0, kibbleFoodId } = body;

    const [cat] = await db.select().from(cats).where(eq(cats.id, catId));
    if (!cat) throw { statusCode: 404, message: 'Cat not found' };

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const entries = await db
      .select()
      .from(feedEntries)
      .where(
        and(
          eq(feedEntries.catId, catId),
          gte(feedEntries.datetime, dayStart),
          lt(feedEntries.datetime, new Date(dayEnd.getTime() + 1)),
        ),
      );

    const kcalToday = Math.round(
      entries.reduce((sum, e) => sum + parseFloat(e.kcalCalculated), 0) * 10,
    ) / 10;

    let meatKcalPer100g = 0;
    let meatFood = null;
    if (meatFoodId && meatGrams > 0) {
      [meatFood] = await db.select().from(foods).where(eq(foods.id, meatFoodId));
      if (!meatFood) throw { statusCode: 404, message: 'Meat food not found' };
      meatKcalPer100g = parseFloat(meatFood.kcalPer100g);
    }

    // Resolve kibble food: by explicit ID if provided, otherwise find default KIBBLE product
    let resolvedKibbleFoodId: string | undefined = kibbleFoodId;
    let kibbleFood: typeof foods.$inferSelect | null = null;
    let kibbleKcalPer100g = STANDARD_KIBBLE_KCAL;

    if (kibbleFoodId) {
      [kibbleFood] = await db.select().from(foods).where(eq(foods.id, kibbleFoodId));
      if (!kibbleFood) throw { statusCode: 404, message: 'Kibble food not found' };
      kibbleKcalPer100g = parseFloat(kibbleFood.kcalPer100g);
      resolvedKibbleFoodId = kibbleFoodId;
    } else {
      // Look up the BASE food (standard kibble) to use its real kcal/100g
      [kibbleFood] = await db
        .select()
        .from(foods)
        .where(and(eq(foods.category, 'BASE'), eq(foods.archived, false)))
        .limit(1);
      if (kibbleFood) {
        kibbleKcalPer100g = parseFloat(kibbleFood.kcalPer100g);
        resolvedKibbleFoodId = kibbleFood.id;
      }
    }

    const result = calculateCloseDay({
      kcalToday,
      dailyKcalTarget: cat.dailyKcalTarget,
      meatGrams,
      meatKcalPer100g,
      kibbleKcalPer100g,
    });

    return { result, cat, meatFood, kibbleFood, kibbleKcalPer100g, resolvedKibbleFoodId };
  }

  // POST /api/close-day — calculate without saving
  fastify.post<{ Body: CloseDayBody }>('/close-day', { schema: { body: bodySchema } }, async (req, reply) => {
    try {
      const { result } = await computeCloseDay(req.body);
      return reply.send(result);
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode) return reply.code(e.statusCode).send({ error: e.message });
      throw err;
    }
  });

  // POST /api/close-day/commit — calculate and save
  fastify.post<{ Body: CloseDayBody }>('/close-day/commit', { schema: { body: bodySchema } }, async (req, reply) => {
    try {
      const { result, meatFood, kibbleKcalPer100g, resolvedKibbleFoodId } = await computeCloseDay(req.body);
      const { date, catId, meatFoodId, meatGrams = 0 } = req.body;

      const savedEntries: (typeof feedEntries.$inferSelect)[] = [];
      const datetime = new Date();

      // Transaction: insert meat + kibble entries
      await db.transaction(async (tx) => {
        // 1. Meat entry
        if (meatFood && meatGrams > 0) {
          const kcal = calculateKcal(meatGrams, parseFloat(meatFood.kcalPer100g));
          const [e] = await tx
            .insert(feedEntries)
            .values({
              catId,
              foodId: meatFoodId!,
              grams: String(meatGrams),
              kcalCalculated: String(kcal),
              datetime,
              note: 'kolacja:mięso',
            })
            .returning();
          savedEntries.push(e);
        }

        // 2. Kibble entry (only if kibbleGrams > 0 and food exists)
        if (result.kibbleGrams > 0 && resolvedKibbleFoodId) {
          const kcal = calculateKcal(result.kibbleGrams, kibbleKcalPer100g);
          const [e] = await tx
            .insert(feedEntries)
            .values({
              catId,
              foodId: resolvedKibbleFoodId,
              grams: String(result.kibbleGrams),
              kcalCalculated: String(kcal),
              datetime: new Date(datetime.getTime() + 60000),
              note: 'kolacja:karma',
            })
            .returning();
          savedEntries.push(e);
        }
      });

      return reply.code(201).send({ ...result, savedEntries });
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode) return reply.code(e.statusCode).send({ error: e.message });
      throw err;
    }
  });
}
