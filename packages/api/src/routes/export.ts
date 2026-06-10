import { FastifyInstance } from 'fastify';
import { eq, and, gte, lt } from 'drizzle-orm';
import { feedEntries, foods, cats } from '../db/schema';
import { createDbClient } from '../db/client';
import { addDays, localDateStr, localTimeStr, zonedDayRange } from '../lib/dates';

export async function exportRoutes(fastify: FastifyInstance) {
  const db = createDbClient(fastify);

  // GET /api/export/csv?catId=UUID&from=YYYY-MM-DD&to=YYYY-MM-DD
  fastify.get<{ Querystring: { catId: string; from: string; to: string } }>(
    '/export/csv',
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

      if (from > to || addDays(from, 366) < to) {
        return reply.code(400).send({ error: 'Date range must be at most 366 days' });
      }

      const [cat] = await db.select().from(cats).where(eq(cats.id, catId));
      if (!cat) return reply.code(404).send({ error: 'Cat not found' });

      const fromDate = zonedDayRange(from).start;
      const toDateExclusive = zonedDayRange(to).end;

      const rows = await db
        .select({
          datetime: feedEntries.datetime,
          foodName: foods.name,
          foodCategory: foods.category,
          foodUnit: foods.unit,
          grams: feedEntries.grams,
          pieces: feedEntries.pieces,
          kcalCalculated: feedEntries.kcalCalculated,
          note: feedEntries.note,
        })
        .from(feedEntries)
        .leftJoin(foods, eq(feedEntries.foodId, foods.id))
        .where(
          and(
            eq(feedEntries.catId, catId),
            gte(feedEntries.datetime, fromDate),
            lt(feedEntries.datetime, toDateExclusive),
          ),
        )
        .orderBy(feedEntries.datetime);

      // Category labels in Polish
      const categoryLabels: Record<string, string> = {
        BASE: 'Baza',
        KIBBLE: 'Karma',
        WET_FOOD: 'Mokra',
        MEAT: 'Mięso',
        TREAT: 'Przysmak',
      };

      // Build CSV
      const header = 'Data,Godzina,Kategoria,Produkt,Gramy,Sztuki,Kcal,Notatka';
      const csvRows = rows.map((row) => {
        const dt = new Date(row.datetime);
        const dateStr = localDateStr(dt);
        const timeStr = localTimeStr(dt);
        const category = categoryLabels[row.foodCategory ?? ''] ?? row.foodCategory ?? '';
        const name = escapeCsvField(row.foodName ?? '');
        const isPiece = row.foodUnit === 'PIECE' && row.pieces != null;
        const grams = isPiece ? '' : parseFloat(row.grams).toFixed(1);
        const pieces = isPiece ? parseFloat(row.pieces!).toFixed(2) : '';
        const kcal = parseFloat(row.kcalCalculated).toFixed(1);
        const note = escapeCsvField(row.note ?? '');
        return `${dateStr},${timeStr},${category},${name},${grams},${pieces},${kcal},${note}`;
      });

      // BOM + content for proper Excel encoding
      const bom = '\uFEFF';
      const csv = bom + header + '\n' + csvRows.join('\n') + '\n';

      const filename = `catcal-${cat.name}-${from}-${to}.csv`;

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(csv);
    },
  );
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
