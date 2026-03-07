import { FastifyInstance } from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, gte, lt } from 'drizzle-orm';
import { feedEntries, foods, cats } from '../db/schema';

export async function exportRoutes(fastify: FastifyInstance) {
  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql);

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

      const [cat] = await db.select().from(cats).where(eq(cats.id, catId));
      if (!cat) return reply.code(404).send({ error: 'Cat not found' });

      const fromDate = new Date(`${from}T00:00:00.000Z`);
      const toDateExclusive = new Date(`${to}T23:59:59.999Z`);

      const rows = await db
        .select({
          datetime: feedEntries.datetime,
          foodName: foods.name,
          foodCategory: foods.category,
          grams: feedEntries.grams,
          kcalCalculated: feedEntries.kcalCalculated,
          note: feedEntries.note,
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
      const header = 'Data,Godzina,Kategoria,Produkt,Gramy,Kcal,Notatka';
      const csvRows = rows.map((row) => {
        const dt = new Date(row.datetime);
        const dateStr = dt.toISOString().split('T')[0];
        const timeStr = dt.toTimeString().substring(0, 5);
        const category = categoryLabels[row.foodCategory ?? ''] ?? row.foodCategory ?? '';
        const name = escapeCsvField(row.foodName ?? '');
        const grams = parseFloat(row.grams).toFixed(1);
        const kcal = parseFloat(row.kcalCalculated).toFixed(1);
        const note = escapeCsvField(row.note ?? '');
        return `${dateStr},${timeStr},${category},${name},${grams},${kcal},${note}`;
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
