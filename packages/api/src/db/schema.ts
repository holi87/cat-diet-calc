import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  date,
  timestamp,
} from 'drizzle-orm/pg-core';

export const cats = pgTable('cats', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  dailyKcalTarget: integer('daily_kcal_target').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const foods = pgTable('foods', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  category: text('category').notNull(), // KIBBLE | WET_FOOD | MEAT | TREAT
  kcalPer100g: numeric('kcal_per_100g', { precision: 8, scale: 2 }).notNull(),
  archived: boolean('archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const feedEntries = pgTable('feed_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  catId: uuid('cat_id')
    .notNull()
    .references(() => cats.id),
  datetime: timestamp('datetime', { withTimezone: true }).notNull(),
  foodId: uuid('food_id')
    .notNull()
    .references(() => foods.id),
  grams: numeric('grams', { precision: 8, scale: 2 }).notNull(),
  kcalCalculated: numeric('kcal_calculated', { precision: 8, scale: 2 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const weightEntries = pgTable('weight_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  catId: uuid('cat_id')
    .notNull()
    .references(() => cats.id),
  date: date('date').notNull(),
  weightKg: numeric('weight_kg', { precision: 5, scale: 3 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Cat = typeof cats.$inferSelect;
export type NewCat = typeof cats.$inferInsert;
export type Food = typeof foods.$inferSelect;
export type NewFood = typeof foods.$inferInsert;
export type FeedEntry = typeof feedEntries.$inferSelect;
export type NewFeedEntry = typeof feedEntries.$inferInsert;
export type WeightEntry = typeof weightEntries.$inferSelect;
export type NewWeightEntry = typeof weightEntries.$inferInsert;
