import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { buildApp } from '../app';

const databaseUrl = process.env.DATABASE_URL ?? '';
const integrationOptions = {
  skip: databaseUrl ? false : 'DATABASE_URL is not set',
};

type BackupEnvelope = {
  format: string;
  version: number;
  exportedAt: string;
  data: {
    cats: { id: string }[];
    foods: { id: string }[];
    feedEntries: { id: string }[];
    weightEntries: { id: string }[];
    dayNotes: { id: string }[];
  };
};

describe('Backup import/export integration', integrationOptions, () => {
  let app: FastifyInstance;
  let sql: postgres.Sql;

  before(async () => {
    process.env.NODE_ENV = 'test';
    sql = postgres(databaseUrl, { max: 1 });
    await migrate(drizzle(sql), { migrationsFolder: './drizzle' });

    app = buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    await sql`
      TRUNCATE TABLE
        feed_entries,
        weight_entries,
        day_notes,
        foods,
        cats
      RESTART IDENTITY CASCADE
    `;
  });

  after(async () => {
    await app.close();
    await sql.end({ timeout: 5 });
  });

  it('round-trips a full dataset through export and replace-all import', async () => {
    // Seed one row per table.
    const cat = await postJson('/api/cats', { name: 'Mysza', dailyKcalTarget: 200 });
    const food = await postJson('/api/foods', {
      name: 'Karma',
      category: 'KIBBLE',
      kcalPer100g: 100,
    });
    const entry = await postJson('/api/feed-entries', {
      catId: cat.id,
      foodId: food.id,
      grams: 30,
      datetime: '2026-06-01T08:00:00.000Z',
    });
    await postJson('/api/weight-entries', { catId: cat.id, date: '2026-06-01', weightKg: 4.1 });
    await putJson('/api/day-notes', { catId: cat.id, date: '2026-06-01', content: 'Dobry dzień' });

    // Export.
    const exportRes = await app.inject({ method: 'GET', url: '/api/export/json' });
    assert.equal(exportRes.statusCode, 200);
    assert.match(exportRes.headers['content-type'] as string, /application\/json/);
    assert.match(
      exportRes.headers['content-disposition'] as string,
      /attachment; filename="catcal-backup-\d{4}-\d{2}-\d{2}\.json"/,
    );

    const envelope = JSON.parse(exportRes.body) as BackupEnvelope;
    assert.equal(envelope.format, 'catcal-backup');
    assert.equal(envelope.version, 1);
    assert.equal(envelope.data.cats.length, 1);
    assert.equal(envelope.data.foods.length, 1);
    assert.equal(envelope.data.feedEntries.length, 1);
    assert.equal(envelope.data.weightEntries.length, 1);
    assert.equal(envelope.data.dayNotes.length, 1);

    // Wipe everything to prove import restores from scratch.
    await sql`
      TRUNCATE TABLE feed_entries, weight_entries, day_notes, foods, cats RESTART IDENTITY CASCADE
    `;
    const emptyCats = await getJson('/api/cats');
    assert.equal(emptyCats.length, 0);

    // Import.
    const importRes = await app.inject({ method: 'POST', url: '/api/import/json', payload: envelope });
    assert.equal(importRes.statusCode, 200);
    assert.deepEqual(JSON.parse(importRes.body), {
      imported: { cats: 1, foods: 1, feedEntries: 1, weightEntries: 1, dayNotes: 1 },
    });

    // Verify data restored with original UUIDs and intact relations.
    const restoredCats = await getJson('/api/cats');
    assert.equal(restoredCats.length, 1);
    assert.equal(restoredCats[0].id, cat.id);
    assert.equal(restoredCats[0].name, 'Mysza');

    const restoredFoods = await getJson('/api/foods');
    assert.equal(restoredFoods[0].id, food.id);

    const summary = await getJson(`/api/day-summary?catId=${cat.id}&date=2026-06-01`);
    assert.equal(summary.entries.length, 1);
    assert.equal(summary.entries[0].id, entry.id);

    const note = await getJson(`/api/day-notes?catId=${cat.id}&date=2026-06-01`);
    assert.equal(note.content, 'Dobry dzień');
  });

  it('rejects a backup with an unsupported format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/import/json',
      payload: {
        format: 'something-else',
        version: 1,
        data: { cats: [], foods: [], feedEntries: [], weightEntries: [], dayNotes: [] },
      },
    });
    assert.equal(res.statusCode, 400);
  });

  it('strips unknown columns from imported rows (mass-assignment guard)', async () => {
    // Fastify's AJV runs with removeAdditional: true, so additionalProperties:
    // false strips unexpected keys before the handler — the bogus column never
    // reaches the insert (it would otherwise crash the transaction with a 400).
    const res = await app.inject({
      method: 'POST',
      url: '/api/import/json',
      payload: {
        format: 'catcal-backup',
        version: 1,
        data: {
          cats: [
            {
              id: '00000000-0000-4000-8000-000000000001',
              name: 'Mysza',
              dailyKcalTarget: 200,
              active: true,
              evilColumn: 'nope',
            },
          ],
          foods: [],
          feedEntries: [],
          weightEntries: [],
          dayNotes: [],
        },
      },
    });
    assert.equal(res.statusCode, 200);

    const cats = await getJson('/api/cats');
    assert.equal(cats.length, 1);
    assert.equal(cats[0].name, 'Mysza');
    assert.equal('evilColumn' in cats[0], false);

    // Wrong value type for a known column is still rejected outright
    const badType = await app.inject({
      method: 'POST',
      url: '/api/import/json',
      payload: {
        format: 'catcal-backup',
        version: 1,
        data: {
          cats: [{ id: 'not-a-uuid', name: 'X', dailyKcalTarget: 'a lot', active: true }],
          foods: [],
          feedEntries: [],
          weightEntries: [],
          dayNotes: [],
        },
      },
    });
    assert.equal(badType.statusCode, 400);
  });

  it('rejects a backup missing required data arrays', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/import/json',
      payload: { format: 'catcal-backup', version: 1, data: { cats: [] } },
    });
    assert.equal(res.statusCode, 400);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function postJson(url: string, payload: unknown): Promise<any> {
    const res = await app.inject({ method: 'POST', url, payload });
    assert.equal(res.statusCode, 201, `POST ${url} failed: ${res.body}`);
    return JSON.parse(res.body);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function putJson(url: string, payload: unknown): Promise<any> {
    const res = await app.inject({ method: 'PUT', url, payload });
    assert.equal(res.statusCode, 200, `PUT ${url} failed: ${res.body}`);
    return JSON.parse(res.body);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function getJson(url: string): Promise<any> {
    const res = await app.inject({ method: 'GET', url });
    assert.equal(res.statusCode, 200, `GET ${url} failed: ${res.body}`);
    return JSON.parse(res.body);
  }
});
