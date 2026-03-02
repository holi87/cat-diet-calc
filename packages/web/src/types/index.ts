export type FoodCategory = 'BASE' | 'KIBBLE' | 'WET_FOOD' | 'MEAT' | 'TREAT';

export interface Cat {
  id: string;
  name: string;
  dailyKcalTarget: number;
  active: boolean;
  createdAt: string;
}

export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  kcalPer100g: string;
  archived: boolean;
  createdAt: string;
}

export interface FeedEntry {
  id: string;
  catId: string;
  datetime: string;
  foodId: string;
  foodName: string | null;
  foodCategory: FoodCategory | null;
  grams: string;
  kcalCalculated: string;
  note: string | null;
  createdAt: string;
}

export interface DaySummary {
  catId: string;
  date: string;
  dailyKcalTarget: number;
  entries: FeedEntry[];
  totalKcal: number;
  remainingKcal: number;
}

export interface CloseDayResult {
  kcalToday: number;
  kcalMeat: number;
  kcalLeftForKibble: number;
  kibbleGrams: number;
  overLimitKcal: number;
  savedEntries?: FeedEntry[];
}

export interface WeightEntry {
  id: string;
  catId: string;
  date: string;
  weightKg: string;
  note: string | null;
  createdAt: string;
}
