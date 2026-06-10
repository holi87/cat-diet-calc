import { FastifyInstance } from 'fastify';
import { cats, foods, feedEntries, weightEntries, dayNotes } from '../db/schema';
import { createDbClient } from '../db/client';

const BACKUP_FORMAT = 'catcal-backup';
const BACKUP_VERSION = 1;

// Tables in parent-first order (used for insert; reversed for delete).
const TABLE_ORDER = ['cats', 'foods', 'feedEntries', 'weightEntries', 'dayNotes'] as const;
type TableKey = (typeof TABLE_ORDER)[number];

type BackupData = Record<TableKey, Record<string, unknown>[]>;

type BackupEnvelope = {
  format: string;
  version: number;
  exportedAt: string;
  data: BackupData;
};

// Timestamp (withTimezone) columns per table — exported as ISO strings,
// must be cast back to Date before insert. `date` columns stay strings.
const TIMESTAMP_FIELDS: Record<TableKey, string[]> = {
  cats: ['createdAt'],
  foods: ['createdAt'],
  feedEntries: ['datetime', 'createdAt'],
  weightEntries: ['createdAt'],
  dayNotes: ['updatedAt'],
};

export async function backupRoutes(fastify: FastifyInstance) {
  const db = createDbClient(fastify);

  // GET /api/export/json — full snapshot of all tables.
  fastify.get('/export/json', async (_req, reply) => {
    const [catsRows, foodsRows, feedRows, weightRows, noteRows] = await Promise.all([
      db.select().from(cats),
      db.select().from(foods),
      db.select().from(feedEntries),
      db.select().from(weightEntries),
      db.select().from(dayNotes),
    ]);

    const envelope: BackupEnvelope = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        cats: catsRows,
        foods: foodsRows,
        feedEntries: feedRows,
        weightEntries: weightRows,
        dayNotes: noteRows,
      },
    };

    const date = envelope.exportedAt.split('T')[0];
    const filename = `catcal-backup-${date}.json`;

    return reply
      .header('Content-Type', 'application/json; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(JSON.stringify(envelope, null, 2));
  });

  // Rows arrive exactly as exported by drizzle: numeric → string, timestamptz →
  // ISO string, date → YYYY-MM-DD string. additionalProperties: false keeps the
  // restore from writing arbitrary columns (mass assignment).
  const uuidField = { type: 'string', format: 'uuid' };
  const numericString = { type: 'string', pattern: '^-?\\d+(\\.\\d+)?$' };
  const nullableNumericString = { type: ['string', 'null'], pattern: '^-?\\d+(\\.\\d+)?$' };
  const isoTimestamp = { type: 'string', minLength: 1 };
  const dateString = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };

  const rowSchemas = {
    cats: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'dailyKcalTarget', 'active'],
      properties: {
        id: uuidField,
        name: { type: 'string', minLength: 1 },
        dailyKcalTarget: { type: 'integer', minimum: 1 },
        targetWeightKg: nullableNumericString,
        photo: { type: ['string', 'null'] },
        active: { type: 'boolean' },
        createdAt: isoTimestamp,
      },
    },
    foods: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'category', 'kcalPer100g'],
      properties: {
        id: uuidField,
        name: { type: 'string', minLength: 1 },
        category: { type: 'string', enum: ['BASE', 'KIBBLE', 'WET_FOOD', 'MEAT', 'TREAT'] },
        kcalPer100g: numericString,
        unit: { type: 'string', enum: ['GRAM', 'PIECE'] },
        kcalPerPiece: nullableNumericString,
        archived: { type: 'boolean' },
        createdAt: isoTimestamp,
      },
    },
    feedEntries: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'catId', 'foodId', 'datetime', 'grams', 'kcalCalculated'],
      properties: {
        id: uuidField,
        catId: uuidField,
        foodId: uuidField,
        datetime: isoTimestamp,
        grams: numericString,
        pieces: nullableNumericString,
        kcalCalculated: numericString,
        note: { type: ['string', 'null'] },
        createdAt: isoTimestamp,
      },
    },
    weightEntries: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'catId', 'date', 'weightKg'],
      properties: {
        id: uuidField,
        catId: uuidField,
        date: dateString,
        weightKg: numericString,
        note: { type: ['string', 'null'] },
        createdAt: isoTimestamp,
      },
    },
    dayNotes: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'catId', 'date', 'content'],
      properties: {
        id: uuidField,
        catId: uuidField,
        date: dateString,
        content: { type: 'string' },
        updatedAt: isoTimestamp,
      },
    },
  };

  const importBodySchema = {
    type: 'object',
    required: ['format', 'version', 'data'],
    properties: {
      format: { type: 'string' },
      version: { type: 'integer' },
      exportedAt: { type: 'string' },
      data: {
        type: 'object',
        required: ['cats', 'foods', 'feedEntries', 'weightEntries', 'dayNotes'],
        properties: {
          cats: { type: 'array', items: rowSchemas.cats },
          foods: { type: 'array', items: rowSchemas.foods },
          feedEntries: { type: 'array', items: rowSchemas.feedEntries },
          weightEntries: { type: 'array', items: rowSchemas.weightEntries },
          dayNotes: { type: 'array', items: rowSchemas.dayNotes },
        },
      },
    },
  };

  const tableFor = { cats, foods, feedEntries, weightEntries, dayNotes };

  // Cast exported ISO timestamp strings back to Date objects for insert.
  function reviveRow(table: TableKey, row: Record<string, unknown>): Record<string, unknown> {
    const revived = { ...row };
    for (const field of TIMESTAMP_FIELDS[table]) {
      const value = revived[field];
      if (typeof value === 'string') revived[field] = new Date(value);
    }
    return revived;
  }

  // POST /api/import/json — replace-all restore in a single transaction.
  fastify.post<{ Body: BackupEnvelope }>(
    '/import/json',
    { schema: { body: importBodySchema }, bodyLimit: 50 * 1024 * 1024 },
    async (req, reply) => {
      const { format, version, data } = req.body;

      if (format !== BACKUP_FORMAT) {
        return reply.code(400).send({ error: `Unsupported format: ${format}` });
      }
      if (version !== BACKUP_VERSION) {
        return reply.code(400).send({ error: `Unsupported version: ${version}` });
      }

      const inserted: Record<TableKey, number> = {
        cats: 0,
        foods: 0,
        feedEntries: 0,
        weightEntries: 0,
        dayNotes: 0,
      };

      try {
        await db.transaction(async (tx) => {
          // Delete children first (FK-safe order = reverse of insert order).
          for (const key of [...TABLE_ORDER].reverse()) {
            await tx.delete(tableFor[key]);
          }

          // Insert parents first.
          for (const key of TABLE_ORDER) {
            const rows = data[key];
            if (rows.length === 0) continue;
            const revived = rows.map((row) => reviveRow(key, row));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await tx.insert(tableFor[key]).values(revived as any);
            inserted[key] = rows.length;
          }
        });
      } catch (err) {
        req.log.error(err);
        return reply.code(400).send({
          error: 'Import failed — data rolled back. Check that the backup file is valid.',
        });
      }

      return reply.send({ imported: inserted });
    },
  );
}
