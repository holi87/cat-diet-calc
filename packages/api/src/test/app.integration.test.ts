import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { buildApp } from '../app';

const databaseUrl = process.env.DATABASE_URL ?? '';
const integrationOptions = {
  skip: databaseUrl ? false : 'DATABASE_URL is not set',
};

type CatResponse = {
  id: string;
  name: string;
  dailyKcalTarget: number;
  targetWeightKg: string | null;
  photo: string | null;
  active: boolean;
};

type FoodResponse = {
  id: string;
  name: string;
  category: string;
  kcalPer100g: string;
  unit: 'GRAM' | 'PIECE';
  kcalPerPiece: string | null;
  archived: boolean;
};

type FeedEntryResponse = {
  id: string;
  foodName?: string | null;
  foodCategory?: string | null;
  foodUnit?: string | null;
  grams: string;
  pieces: string | null;
  kcalCalculated: string;
  note: string | null;
};

type DaySummaryResponse = {
  catId: string;
  date: string;
  dailyKcalTarget: number;
  entries: FeedEntryResponse[];
  totalKcal: number;
  remainingKcal: number;
};

describe('API integration', integrationOptions, () => {
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

  it('returns health status', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ok' });
  });

  it('creates, updates, lists, and soft-deletes cats', async () => {
    const cat = await createCat({ name: 'Luna', dailyKcalTarget: 210, targetWeightKg: 4.2 });

    assert.equal(cat.name, 'Luna');
    assert.equal(cat.dailyKcalTarget, 210);
    assert.equal(cat.targetWeightKg, '4.200');

    const updated = await requestJson<CatResponse>({
      method: 'PUT',
      url: `/api/cats/${cat.id}`,
      payload: { dailyKcalTarget: 220, targetWeightKg: null, photo: 'base64-photo' },
    });

    assert.equal(updated.statusCode, 200);
    assert.equal(updated.body.dailyKcalTarget, 220);
    assert.equal(updated.body.targetWeightKg, null);
    assert.equal(updated.body.photo, 'base64-photo');

    const listed = await requestJson<CatResponse[]>({ method: 'GET', url: '/api/cats' });
    assert.deepEqual(
      listed.body.map((item) => item.id),
      [cat.id],
    );

    const deleted = await app.inject({ method: 'DELETE', url: `/api/cats/${cat.id}` });
    assert.equal(deleted.statusCode, 204);

    const afterDelete = await requestJson<CatResponse[]>({ method: 'GET', url: '/api/cats' });
    assert.deepEqual(afterDelete.body, []);

    // The admin view can still reach the deactivated cat to re-activate it
    const withInactive = await requestJson<CatResponse[]>({
      method: 'GET',
      url: '/api/cats?includeInactive=true',
    });
    assert.equal(withInactive.body.length, 1);
    assert.equal(withInactive.body[0].id, cat.id);
    assert.equal(withInactive.body[0].active, false);
  });

  it('validates cat payloads', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/cats',
      payload: { name: '', dailyKcalTarget: 0 },
    });

    assert.equal(response.statusCode, 400);
  });

  it('creates gram and piece foods, filters lists, updates units, and archives foods', async () => {
    const kibble = await createFood({
      name: 'Karma testowa',
      category: 'KIBBLE',
      kcalPer100g: 100,
    });
    const treat = await createFood({
      name: 'Przysmak testowy',
      category: 'TREAT',
      kcalPer100g: 0,
      unit: 'PIECE',
      kcalPerPiece: 1.5,
    });

    assert.equal(kibble.unit, 'GRAM');
    assert.equal(kibble.kcalPerPiece, null);
    assert.equal(treat.unit, 'PIECE');
    assert.equal(treat.kcalPerPiece, '1.50');

    const invalidPieceFood = await app.inject({
      method: 'POST',
      url: '/api/foods',
      payload: { name: 'Broken', category: 'TREAT', kcalPer100g: 0, unit: 'PIECE' },
    });
    assert.equal(invalidPieceFood.statusCode, 400);

    const treatOnly = await requestJson<FoodResponse[]>({
      method: 'GET',
      url: '/api/foods?category=TREAT',
    });
    assert.deepEqual(
      treatOnly.body.map((food) => food.id),
      [treat.id],
    );

    const updated = await requestJson<FoodResponse>({
      method: 'PUT',
      url: `/api/foods/${kibble.id}`,
      payload: { unit: 'PIECE', kcalPerPiece: 2, kcalPer100g: 0 },
    });
    assert.equal(updated.statusCode, 200);
    assert.equal(updated.body.unit, 'PIECE');
    assert.equal(updated.body.kcalPerPiece, '2.00');

    const archived = await requestJson<FoodResponse>({
      method: 'POST',
      url: `/api/foods/${treat.id}/archive`,
    });
    assert.equal(archived.body.archived, true);

    const activeFoods = await requestJson<FoodResponse[]>({ method: 'GET', url: '/api/foods' });
    assert.deepEqual(
      activeFoods.body.map((food) => food.id),
      [kibble.id],
    );

    const allFoods = await requestJson<FoodResponse[]>({
      method: 'GET',
      url: '/api/foods?archived=true',
    });
    assert.equal(allFoods.body.length, 2);
  });

  it('creates gram and piece feed entries with kcal snapshots and deletes entries', async () => {
    const cat = await createCat();
    const wetFood = await createFood({ name: 'Mokra', category: 'WET_FOOD', kcalPer100g: 85 });
    const treat = await createFood({
      name: 'Przysmak',
      category: 'TREAT',
      kcalPer100g: 0,
      unit: 'PIECE',
      kcalPerPiece: 1.5,
    });

    const wetEntry = await addFeedEntry({
      catId: cat.id,
      foodId: wetFood.id,
      grams: 35,
      datetime: '2026-06-01T08:00:00.000Z',
    });
    assert.equal(wetEntry.grams, '35.00');
    assert.equal(wetEntry.pieces, null);
    assert.equal(wetEntry.kcalCalculated, '29.80');

    const treatEntry = await addFeedEntry({
      catId: cat.id,
      foodId: treat.id,
      pieces: 1,
      datetime: '2026-06-01T09:00:00.000Z',
    });
    assert.equal(treatEntry.grams, '0.00');
    assert.equal(treatEntry.pieces, '1.00');
    assert.equal(treatEntry.kcalCalculated, '1.50');

    const missingPieces = await app.inject({
      method: 'POST',
      url: '/api/feed-entries',
      payload: { catId: cat.id, foodId: treat.id, grams: 1 },
    });
    assert.equal(missingPieces.statusCode, 400);

    const deleted = await requestJson<{ success: true }>({
      method: 'DELETE',
      url: `/api/feed-entries/${wetEntry.id}`,
    });
    assert.equal(deleted.statusCode, 200);
    assert.deepEqual(deleted.body, { success: true });
  });

  it('rejects invalid feed-entry payloads with 4xx instead of raw driver errors', async () => {
    const cat = await createCat();
    const kibble = await createFood({ name: 'Karma', category: 'KIBBLE', kcalPer100g: 100 });

    const badDatetime = await app.inject({
      method: 'POST',
      url: '/api/feed-entries',
      payload: { catId: cat.id, foodId: kibble.id, grams: 10, datetime: 'not-a-date' },
    });
    assert.equal(badDatetime.statusCode, 400);

    const hugeGrams = await app.inject({
      method: 'POST',
      url: '/api/feed-entries',
      payload: { catId: cat.id, foodId: kibble.id, grams: 999999 },
    });
    assert.equal(hugeGrams.statusCode, 400);

    const missingCat = await app.inject({
      method: 'POST',
      url: '/api/feed-entries',
      payload: { catId: '00000000-0000-4000-8000-000000000000', foodId: kibble.id, grams: 10 },
    });
    assert.equal(missingCat.statusCode, 404);

    await requestJson({ method: 'POST', url: `/api/foods/${kibble.id}/archive` });
    const archivedFood = await app.inject({
      method: 'POST',
      url: '/api/feed-entries',
      payload: { catId: cat.id, foodId: kibble.id, grams: 10 },
    });
    assert.equal(archivedFood.statusCode, 409);
  });

  it('caps history and CSV export date ranges at 366 days', async () => {
    const cat = await createCat();

    const history = await app.inject({
      method: 'GET',
      url: `/api/history/daily?catId=${cat.id}&from=2020-01-01&to=2026-06-01`,
    });
    assert.equal(history.statusCode, 400);

    const csv = await app.inject({
      method: 'GET',
      url: `/api/export/csv?catId=${cat.id}&from=2020-01-01&to=2026-06-01`,
    });
    assert.equal(csv.statusCode, 400);
  });

  it('summarizes one day only, including piece entries', async () => {
    const cat = await createCat({ dailyKcalTarget: 50 });
    const kibble = await createFood({ name: 'Karma', category: 'KIBBLE', kcalPer100g: 100 });
    const treat = await createFood({
      name: 'Przysmak',
      category: 'TREAT',
      kcalPer100g: 0,
      unit: 'PIECE',
      kcalPerPiece: 1.5,
    });
    await addFeedEntry({
      catId: cat.id,
      foodId: kibble.id,
      grams: 10,
      datetime: '2026-06-01T08:00:00.000Z',
    });
    await addFeedEntry({
      catId: cat.id,
      foodId: treat.id,
      pieces: 1,
      datetime: '2026-06-01T12:00:00.000Z',
    });
    await addFeedEntry({
      catId: cat.id,
      foodId: kibble.id,
      grams: 20,
      datetime: '2026-06-02T08:00:00.000Z',
    });

    const summary = await requestJson<DaySummaryResponse>({
      method: 'GET',
      url: `/api/day-summary?catId=${cat.id}&date=2026-06-01`,
    });

    assert.equal(summary.statusCode, 200);
    assert.equal(summary.body.totalKcal, 11.5);
    assert.equal(summary.body.remainingKcal, 38.5);
    assert.equal(summary.body.entries.length, 2);
    assert.equal(summary.body.entries[1].foodUnit, 'PIECE');
    assert.equal(summary.body.entries[1].pieces, '1.00');
  });

  it('calculates and commits close-day dinner entries transactionally', async () => {
    const cat = await createCat({ dailyKcalTarget: 220 });
    const baseFood = await createFood({ name: 'Baza', category: 'BASE', kcalPer100g: 120 });
    const morningFood = await createFood({ name: 'Karma', category: 'KIBBLE', kcalPer100g: 100 });
    const meatFood = await createFood({ name: 'Królik', category: 'MEAT', kcalPer100g: 114 });
    await addFeedEntry({
      catId: cat.id,
      foodId: morningFood.id,
      grams: 100,
      datetime: '2026-06-01T08:00:00.000Z',
    });

    const calculated = await requestJson<{
      kcalToday: number;
      kcalMeat: number;
      kcalLeftForKibble: number;
      kibbleGrams: number;
      overLimitKcal: number;
    }>({
      method: 'POST',
      url: '/api/close-day',
      payload: {
        catId: cat.id,
        date: '2026-06-01',
        meatFoodId: meatFood.id,
        meatGrams: 40,
      },
    });

    assert.equal(calculated.statusCode, 200);
    assert.deepEqual(calculated.body, {
      kcalToday: 100,
      kcalMeat: 45.6,
      kcalLeftForKibble: 74.4,
      kibbleGrams: 62,
      overLimitKcal: 0,
    });

    const committed = await requestJson<typeof calculated.body & { savedEntries: FeedEntryResponse[] }>({
      method: 'POST',
      url: '/api/close-day/commit',
      payload: {
        catId: cat.id,
        date: '2026-06-01',
        meatFoodId: meatFood.id,
        meatGrams: 40,
      },
    });

    assert.equal(committed.statusCode, 201);
    assert.equal(committed.body.savedEntries.length, 2);
    assert.equal(committed.body.savedEntries[0].note, 'kolacja:mięso');
    assert.equal(committed.body.savedEntries[0].kcalCalculated, '45.60');
    assert.equal(committed.body.savedEntries[1].note, 'kolacja:karma');
    assert.equal(committed.body.savedEntries[1].grams, '62.00');
    assert.equal(committed.body.savedEntries[1].kcalCalculated, '74.40');
    assert.equal(committed.body.savedEntries[1].pieces, null);
    assert.equal(committed.body.savedEntries[1].id.length > 0, true);
    assert.equal(committed.body.savedEntries[1].foodId, baseFood.id);
  });

  it('assigns entries around local midnight to the Europe/Warsaw day', async () => {
    const cat = await createCat({ dailyKcalTarget: 200 });
    const kibble = await createFood({ name: 'Karma', category: 'KIBBLE', kcalPer100g: 100 });
    // 23:30 UTC on Jun 1 = 01:30 on Jun 2 in Warsaw (UTC+2 in summer)
    await addFeedEntry({
      catId: cat.id,
      foodId: kibble.id,
      grams: 10,
      datetime: '2026-06-01T23:30:00.000Z',
    });
    // 21:30 UTC on Jun 1 = 23:30 on Jun 1 in Warsaw
    await addFeedEntry({
      catId: cat.id,
      foodId: kibble.id,
      grams: 20,
      datetime: '2026-06-01T21:30:00.000Z',
    });

    const day1 = await requestJson<DaySummaryResponse>({
      method: 'GET',
      url: `/api/day-summary?catId=${cat.id}&date=2026-06-01`,
    });
    const day2 = await requestJson<DaySummaryResponse>({
      method: 'GET',
      url: `/api/day-summary?catId=${cat.id}&date=2026-06-02`,
    });

    assert.equal(day1.body.totalKcal, 20);
    assert.equal(day2.body.totalKcal, 10);
  });

  it('stores dinner entries inside the closed day when committing a past day', async () => {
    const cat = await createCat({ dailyKcalTarget: 220 });
    await createFood({ name: 'Baza', category: 'BASE', kcalPer100g: 100 });

    const committed = await requestJson<{
      savedEntries: Array<{ datetime: string; note: string | null }>;
    }>({
      method: 'POST',
      url: '/api/close-day/commit',
      payload: { catId: cat.id, date: '2026-06-01' },
    });

    assert.equal(committed.statusCode, 201);
    assert.equal(committed.body.savedEntries.length, 1);
    const ts = new Date(committed.body.savedEntries[0].datetime).getTime();
    // 2026-06-01 in Warsaw = [2026-05-31T22:00Z, 2026-06-01T22:00Z)
    assert.equal(ts >= Date.parse('2026-05-31T22:00:00.000Z'), true);
    assert.equal(ts < Date.parse('2026-06-01T22:00:00.000Z'), true);
  });

  it('rejects a second close-day commit for the same day with 409', async () => {
    const cat = await createCat({ dailyKcalTarget: 220 });
    await createFood({ name: 'Baza', category: 'BASE', kcalPer100g: 100 });

    const first = await app.inject({
      method: 'POST',
      url: '/api/close-day/commit',
      payload: { catId: cat.id, date: '2026-06-01' },
    });
    assert.equal(first.statusCode, 201);

    const second = await app.inject({
      method: 'POST',
      url: '/api/close-day/commit',
      payload: { catId: cat.id, date: '2026-06-01' },
    });
    assert.equal(second.statusCode, 409);

    // Another day for the same cat still commits fine
    const otherDay = await app.inject({
      method: 'POST',
      url: '/api/close-day/commit',
      payload: { catId: cat.id, date: '2026-06-02' },
    });
    assert.equal(otherDay.statusCode, 201);
  });

  it('rejects commit with 409 when kibble is needed but no kibble product exists', async () => {
    const cat = await createCat({ dailyKcalTarget: 220 });
    await createFood({ name: 'Królik', category: 'MEAT', kcalPer100g: 114 });

    const committed = await app.inject({
      method: 'POST',
      url: '/api/close-day/commit',
      payload: { catId: cat.id, date: '2026-06-01' },
    });

    assert.equal(committed.statusCode, 409);

    const summary = await requestJson<DaySummaryResponse>({
      method: 'GET',
      url: `/api/day-summary?catId=${cat.id}&date=2026-06-01`,
    });
    assert.equal(summary.body.entries.length, 0);
  });

  it('falls back to an active KIBBLE product when no BASE food exists', async () => {
    const cat = await createCat({ dailyKcalTarget: 220 });
    const kibble = await createFood({ name: 'Karma sucha', category: 'KIBBLE', kcalPer100g: 100 });

    const committed = await requestJson<{
      savedEntries: Array<{ foodId?: string; note: string | null; grams: string }>;
    }>({
      method: 'POST',
      url: '/api/close-day/commit',
      payload: { catId: cat.id, date: '2026-06-01' },
    });

    assert.equal(committed.statusCode, 201);
    assert.equal(committed.body.savedEntries.length, 1);
    assert.equal(committed.body.savedEntries[0].note, 'kolacja:karma');
    assert.equal(committed.body.savedEntries[0].foodId, kibble.id);
  });

  it('commits a manual dinner transactionally with explicit kibble grams', async () => {
    const cat = await createCat({ dailyKcalTarget: 220 });
    await createFood({ name: 'Baza', category: 'BASE', kcalPer100g: 120 });
    const meatFood = await createFood({ name: 'Królik', category: 'MEAT', kcalPer100g: 114 });

    const committed = await requestJson<{
      kibbleGrams: number;
      savedEntries: FeedEntryResponse[];
    }>({
      method: 'POST',
      url: '/api/close-day/commit',
      payload: {
        catId: cat.id,
        date: '2026-06-01',
        meatFoodId: meatFood.id,
        meatGrams: 40,
        kibbleGrams: 30,
      },
    });

    assert.equal(committed.statusCode, 201);
    assert.equal(committed.body.kibbleGrams, 30);
    assert.equal(committed.body.savedEntries.length, 2);
    assert.equal(committed.body.savedEntries[0].note, 'kolacja:mięso');
    assert.equal(committed.body.savedEntries[0].grams, '40.00');
    assert.equal(committed.body.savedEntries[1].note, 'kolacja:karma');
    assert.equal(committed.body.savedEntries[1].grams, '30.00');
    // 30 g at 120 kcal/100g
    assert.equal(committed.body.savedEntries[1].kcalCalculated, '36.00');
  });

  it('stores and lists weight entries in newest-first order', async () => {
    const cat = await createCat();
    await createWeight({ catId: cat.id, date: '2026-06-01', weightKg: 4.2 });
    await createWeight({ catId: cat.id, date: '2026-06-08', weightKg: 4.15, note: 'po tygodniu' });

    const response = await requestJson<Array<{ date: string; weightKg: string; note: string | null }>>({
      method: 'GET',
      url: `/api/weight-entries?catId=${cat.id}`,
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(
      response.body.map((entry) => entry.date),
      ['2026-06-08', '2026-06-01'],
    );
    assert.equal(response.body[0].weightKg, '4.150');
    assert.equal(response.body[0].note, 'po tygodniu');
  });

  it('returns empty day notes and upserts note content', async () => {
    const cat = await createCat();

    const empty = await requestJson<{ catId: string; date: string; content: string }>({
      method: 'GET',
      url: `/api/day-notes?catId=${cat.id}&date=2026-06-01`,
    });
    assert.deepEqual(empty.body, { catId: cat.id, date: '2026-06-01', content: '' });

    const created = await requestJson<{ content: string }>({
      method: 'PUT',
      url: '/api/day-notes',
      payload: { catId: cat.id, date: '2026-06-01', content: 'Dobra energia' },
    });
    assert.equal(created.body.content, 'Dobra energia');

    const updated = await requestJson<{ content: string }>({
      method: 'PUT',
      url: '/api/day-notes',
      payload: { catId: cat.id, date: '2026-06-01', content: 'Zjadł mniej' },
    });
    assert.equal(updated.body.content, 'Zjadł mniej');
  });

  it('builds daily history with date gaps, aggregates, weights, and notes', async () => {
    const cat = await createCat({ dailyKcalTarget: 220, targetWeightKg: 4.2 });
    const kibble = await createFood({ name: 'Karma', category: 'KIBBLE', kcalPer100g: 100 });
    const wet = await createFood({ name: 'Mokra', category: 'WET_FOOD', kcalPer100g: 80 });
    await addFeedEntry({
      catId: cat.id,
      foodId: kibble.id,
      grams: 10,
      datetime: '2026-06-01T08:00:00.000Z',
    });
    await addFeedEntry({
      catId: cat.id,
      foodId: wet.id,
      grams: 25,
      datetime: '2026-06-03T08:00:00.000Z',
    });
    await createWeight({ catId: cat.id, date: '2026-06-02', weightKg: 4.2 });
    await requestJson({
      method: 'PUT',
      url: '/api/day-notes',
      payload: { catId: cat.id, date: '2026-06-03', content: 'Mokra poszła dobrze' },
    });

    const history = await requestJson<{
      dailyKcalTarget: number;
      targetWeightKg: number | null;
      days: Array<{
        date: string;
        totalKcal: number;
        totalGrams: number;
        categories: Array<{ category: string; kcal: number; grams: number }>;
      }>;
      weights: Array<{ date: string; weightKg: number }>;
      notes: Record<string, string>;
    }>({
      method: 'GET',
      url: `/api/history/daily?catId=${cat.id}&from=2026-06-01&to=2026-06-03`,
    });

    assert.equal(history.statusCode, 200);
    assert.equal(history.body.dailyKcalTarget, 220);
    assert.equal(history.body.targetWeightKg, 4.2);
    assert.deepEqual(
      history.body.days.map((day) => day.date),
      ['2026-06-01', '2026-06-02', '2026-06-03'],
    );
    assert.equal(history.body.days[0].totalKcal, 10);
    assert.equal(history.body.days[1].totalKcal, 0);
    assert.equal(history.body.days[2].totalKcal, 20);
    assert.deepEqual(history.body.weights, [{ date: '2026-06-02', weightKg: 4.2 }]);
    assert.deepEqual(history.body.notes, { '2026-06-03': 'Mokra poszła dobrze' });
  });

  it('exports CSV with gram and piece entries, Polish categories, BOM, and escaping', async () => {
    const cat = await createCat({ name: 'Luna' });
    const kibble = await createFood({ name: 'Karma', category: 'KIBBLE', kcalPer100g: 100 });
    const treat = await createFood({
      name: 'Treat, "special"',
      category: 'TREAT',
      kcalPer100g: 0,
      unit: 'PIECE',
      kcalPerPiece: 1.5,
    });
    await addFeedEntry({
      catId: cat.id,
      foodId: kibble.id,
      grams: 10,
      datetime: '2026-06-01T08:00:00.000Z',
      note: 'normal',
    });
    await addFeedEntry({
      catId: cat.id,
      foodId: treat.id,
      pieces: 2,
      datetime: '2026-06-01T09:00:00.000Z',
      note: 'note, "quoted"',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/export/csv?catId=${cat.id}&from=2026-06-01&to=2026-06-01`,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['content-type'], 'text/csv; charset=utf-8');
    assert.equal(
      response.headers['content-disposition'],
      'attachment; filename="catcal-Luna-2026-06-01-2026-06-01.csv"',
    );
    assert.equal(response.body.charCodeAt(0), 0xfeff);
    assert.match(response.body, /Data,Godzina,Kategoria,Produkt,Gramy,Sztuki,Kcal,Notatka/);
    assert.match(response.body, /Karma,Karma,10\.0,,10\.0,normal/);
    assert.match(
      response.body,
      /Przysmak,"Treat, ""special""",,2\.00,3\.0,"note, ""quoted"""/,
    );
  });

  async function createCat(overrides: Partial<{
    name: string;
    dailyKcalTarget: number;
    targetWeightKg: number | null;
    photo: string | null;
  }> = {}) {
    const response = await requestJson<CatResponse>({
      method: 'POST',
      url: '/api/cats',
      payload: {
        name: 'Puszek',
        dailyKcalTarget: 220,
        ...overrides,
      },
    });

    assert.equal(response.statusCode, 201);
    return response.body;
  }

  async function createFood(input: {
    name: string;
    category: string;
    kcalPer100g: number;
    unit?: 'GRAM' | 'PIECE';
    kcalPerPiece?: number;
  }) {
    const response = await requestJson<FoodResponse>({
      method: 'POST',
      url: '/api/foods',
      payload: input,
    });

    assert.equal(response.statusCode, 201);
    return response.body;
  }

  async function addFeedEntry(input: {
    catId: string;
    foodId: string;
    grams?: number;
    pieces?: number;
    datetime?: string;
    note?: string;
  }) {
    const response = await requestJson<FeedEntryResponse>({
      method: 'POST',
      url: '/api/feed-entries',
      payload: input,
    });

    assert.equal(response.statusCode, 201);
    return response.body;
  }

  async function createWeight(input: {
    catId: string;
    date: string;
    weightKg: number;
    note?: string;
  }) {
    const response = await requestJson({
      method: 'POST',
      url: '/api/weight-entries',
      payload: input,
    });

    assert.equal(response.statusCode, 201);
    return response.body;
  }

  async function requestJson<T>(options: {
    method: string;
    url: string;
    payload?: unknown;
  }): Promise<{ statusCode: number; body: T; response: LightMyRequestResponse }> {
    const response = await app.inject(options);
    const body = response.body ? (JSON.parse(response.body) as T) : (undefined as T);

    return { statusCode: response.statusCode, body, response };
  }
});
