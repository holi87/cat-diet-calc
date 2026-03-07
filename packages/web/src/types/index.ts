export type FoodCategory = 'BASE' | 'KIBBLE' | 'WET_FOOD' | 'MEAT' | 'TREAT';

export interface Cat {
  id: string;
  name: string;
  dailyKcalTarget: number;
  targetWeightKg: string | null;
  photo: string | null;
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

export interface CategoryAggregate {
  category: FoodCategory;
  kcal: number;
  grams: number;
}

export interface DayAggregate {
  date: string;
  categories: CategoryAggregate[];
  totalKcal: number;
  totalGrams: number;
}

export interface WeightPoint {
  date: string;
  weightKg: number;
}

export interface DailyHistoryResponse {
  catId: string;
  from: string;
  to: string;
  dailyKcalTarget: number;
  targetWeightKg: number | null;
  days: DayAggregate[];
  weights: WeightPoint[];
  notes: Record<string, string>;
}

export interface DayNote {
  id: string;
  catId: string;
  date: string;
  content: string;
  updatedAt: string;
}
