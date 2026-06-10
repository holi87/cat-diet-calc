import { FastifyInstance } from 'fastify';
import { eq, and, gte, lt, like } from 'drizzle-orm';
import { feedEntries, cats, foods } from '../db/schema';
import { createDbClient } from '../db/client';
import { calculateCloseDay, calculateKcal } from '../lib/calc';
import { localDateStr, zonedDayRange } from '../lib/dates';

const STANDARD_KIBBLE_KCAL = 100; // 1g = 1 kcal

export async function closeDayRoutes(fastify: FastifyInstance) {
  const db = createDbClient(fastify);

  const bodySchema = {
    type: 'object',
    required: ['catId', 'date'],
    properties: {
      catId: { type: 'string', format: 'uuid' },
      date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      meatFoodId: { type: 'string', format: 'uuid' },
      meatGrams: { type: 'number', minimum: 0, maximum: 5000 },
      kibbleFoodId: { type: 'string', format: 'uuid' },
      // Manual dinner mode: caller picks the kibble grams instead of the calculator
      kibbleGrams: { type: 'number', minimum: 0, maximum: 5000 },
    },
  };

  type CloseDayBody = {
    catId: string;
    date: string;
    meatFoodId?: string;
    meatGrams?: number;
    kibbleFoodId?: string;
    kibbleGrams?: number;
  };

  async function computeCloseDay(body: CloseDayBody) {
    const { catId, date, meatFoodId, meatGrams = 0, kibbleFoodId } = body;

    const [cat] = await db.select().from(cats).where(eq(cats.id, catId));
    if (!cat) throw { statusCode: 404, message: 'Cat not found' };

    const { start: dayStart, end: dayEnd } = zonedDayRange(date);

    const entries = await db
      .select()
      .from(feedEntries)
      .where(
        and(
          eq(feedEntries.catId, catId),
          gte(feedEntries.datetime, dayStart),
          lt(feedEntries.datetime, dayEnd),
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
      // The dinner flow is gram-based; piece-unit and archived products would
      // bypass the unit rules enforced everywhere else
      if (meatFood.unit === 'PIECE') {
        throw { statusCode: 400, message: 'Piece-unit foods cannot be used as the dinner add-on' };
      }
      if (meatFood.archived) throw { statusCode: 400, message: 'Meat food is archived' };
      meatKcalPer100g = parseFloat(meatFood.kcalPer100g);
    }

    // Resolve kibble food: by explicit ID if provided, otherwise find default KIBBLE product
    let resolvedKibbleFoodId: string | undefined = kibbleFoodId;
    let kibbleFood: typeof foods.$inferSelect | null = null;
    let kibbleKcalPer100g = STANDARD_KIBBLE_KCAL;

    if (kibbleFoodId) {
      [kibbleFood] = await db.select().from(foods).where(eq(foods.id, kibbleFoodId));
      if (!kibbleFood) throw { statusCode: 404, message: 'Kibble food not found' };
      if (kibbleFood.unit === 'PIECE') {
        throw { statusCode: 400, message: 'Piece-unit foods cannot be used as kibble' };
      }
      if (kibbleFood.archived) throw { statusCode: 400, message: 'Kibble food is archived' };
      kibbleKcalPer100g = parseFloat(kibbleFood.kcalPer100g);
      resolvedKibbleFoodId = kibbleFoodId;
    } else {
      // Look up the BASE food (standard kibble) to use its real kcal/100g;
      // fall back to a regular KIBBLE product (same as the manual mode in the UI)
      [kibbleFood] = await db
        .select()
        .from(foods)
        .where(and(eq(foods.category, 'BASE'), eq(foods.archived, false), eq(foods.unit, 'GRAM')))
        .limit(1);
      if (!kibbleFood) {
        [kibbleFood] = await db
          .select()
          .from(foods)
          .where(and(eq(foods.category, 'KIBBLE'), eq(foods.archived, false), eq(foods.unit, 'GRAM')))
          .limit(1);
      }
      if (kibbleFood) {
        kibbleKcalPer100g = parseFloat(kibbleFood.kcalPer100g);
        resolvedKibbleFoodId = kibbleFood.id;
      }
    }

    // calculateCloseDay divides by this — a 0 kcal/100g product would yield
    // Infinity grams and a driver error on insert
    if (kibbleKcalPer100g <= 0) {
      throw { statusCode: 400, message: 'Kibble product has 0 kcal/100g — fix it in Admin → Produkty' };
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
  // With `kibbleGrams` in the body the caller picks the kibble amount (manual
  // dinner); otherwise the calculator result is used.
  fastify.post<{ Body: CloseDayBody }>('/close-day/commit', { schema: { body: bodySchema } }, async (req, reply) => {
    try {
      const { result, meatFood, kibbleKcalPer100g, resolvedKibbleFoodId } = await computeCloseDay(req.body);
      const { date, catId, meatFoodId, meatGrams = 0 } = req.body;
      const kibbleGramsToSave = req.body.kibbleGrams ?? result.kibbleGrams;

      // The success response would claim the kibble was saved — refuse instead
      // of silently skipping the entry when no kibble product exists.
      if (kibbleGramsToSave > 0 && !resolvedKibbleFoodId) {
        throw {
          statusCode: 409,
          message: 'Brak aktywnego produktu karmy (kategoria BASE lub KIBBLE) — dodaj go w Adminie → Produkty',
        };
      }

      const savedEntries: (typeof feedEntries.$inferSelect)[] = [];

      // Keep dinner entries inside the day being closed — committing after local
      // midnight (or for a past day) must not leak entries into the current day.
      const { start: dayStart, end: dayEnd } = zonedDayRange(date);
      let datetime: Date;
      let kibbleDatetime: Date;
      if (date === localDateStr()) {
        datetime = new Date();
        kibbleDatetime = new Date(datetime.getTime() + 60_000);
        if (kibbleDatetime.getTime() >= dayEnd.getTime()) {
          kibbleDatetime = new Date(dayEnd.getTime() - 60_000);
          if (datetime.getTime() >= kibbleDatetime.getTime()) {
            datetime = new Date(kibbleDatetime.getTime() - 60_000);
          }
        }
      } else {
        datetime = new Date(dayEnd.getTime() - 120_000);
        kibbleDatetime = new Date(dayEnd.getTime() - 60_000);
      }

      // Transaction: idempotency guard + insert meat and kibble entries
      await db.transaction(async (tx) => {
        // A day can be closed only once — a double tap, network retry or a
        // second tab must not duplicate the dinner.
        const existingDinner = await tx
          .select({ id: feedEntries.id })
          .from(feedEntries)
          .where(
            and(
              eq(feedEntries.catId, catId),
              gte(feedEntries.datetime, dayStart),
              lt(feedEntries.datetime, dayEnd),
              like(feedEntries.note, 'kolacja:%'),
            ),
          )
          .limit(1);
        if (existingDinner.length > 0) {
          throw { statusCode: 409, message: 'Dzień jest już domknięty — kolacja została wcześniej zapisana' };
        }

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

        // 2. Kibble entry
        if (kibbleGramsToSave > 0 && resolvedKibbleFoodId) {
          const kcal = calculateKcal(kibbleGramsToSave, kibbleKcalPer100g);
          const [e] = await tx
            .insert(feedEntries)
            .values({
              catId,
              foodId: resolvedKibbleFoodId,
              grams: String(kibbleGramsToSave),
              kcalCalculated: String(kcal),
              datetime: kibbleDatetime,
              note: 'kolacja:karma',
            })
            .returning();
          savedEntries.push(e);
        }
      });

      return reply.code(201).send({ ...result, kibbleGrams: kibbleGramsToSave, savedEntries });
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode) return reply.code(e.statusCode).send({ error: e.message });
      throw err;
    }
  });
}
