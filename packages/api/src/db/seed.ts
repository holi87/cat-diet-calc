import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { cats, foods } from './schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const sql = postgres(databaseUrl, { max: 1 });
const db = drizzle(sql);

async function main() {
  console.log('Seeding database...');

  // Insert default cat
  const existingCats = await db.select().from(cats);
  if (existingCats.length === 0) {
    await db.insert(cats).values({
      name: 'Puszek',
      dailyKcalTarget: 220,
      active: true,
    });
    console.log('Cat "Puszek" created.');
  } else {
    console.log('Cats already exist, skipping.');
  }

  // Insert default foods
  const existingFoods = await db.select().from(foods);
  if (existingFoods.length === 0) {
    await db.insert(foods).values([
      { name: 'Karma standardowa', category: 'KIBBLE', kcalPer100g: '100' },
      { name: 'Karma mokra Animonda', category: 'WET_FOOD', kcalPer100g: '85' },
      { name: 'Królik surowy', category: 'MEAT', kcalPer100g: '114' },
      { name: 'Wołowina chuda', category: 'MEAT', kcalPer100g: '121' },
      { name: 'Drób surowy', category: 'MEAT', kcalPer100g: '110' },
    ]);
    console.log('Default foods created.');
  } else {
    console.log('Foods already exist, skipping.');
  }

  console.log('Seed complete.');
  await sql.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
