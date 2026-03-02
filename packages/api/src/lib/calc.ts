/**
 * Calculate kcal for a given amount of food.
 * Result rounded to 1 decimal place.
 */
export function calculateKcal(grams: number, kcalPer100g: number): number {
  return Math.round((grams * kcalPer100g / 100) * 10) / 10;
}

export interface CloseDayInput {
  kcalToday: number;
  dailyKcalTarget: number;
  meatGrams: number;
  meatKcalPer100g: number;
  kibbleKcalPer100g: number;
}

export interface CloseDayResult {
  kcalToday: number;
  kcalMeat: number;
  kcalLeftForKibble: number;
  kibbleGrams: number;
  overLimitKcal: number;
}

export function calculateCloseDay(input: CloseDayInput): CloseDayResult {
  const { kcalToday, dailyKcalTarget, meatGrams, meatKcalPer100g, kibbleKcalPer100g } = input;

  const kcalMeat = calculateKcal(meatGrams, meatKcalPer100g);
  const kcalLeftForKibble = Math.round((dailyKcalTarget - kcalToday - kcalMeat) * 10) / 10;
  const kibbleGrams = Math.round((kcalLeftForKibble * 100 / kibbleKcalPer100g) * 10) / 10;
  const overLimitKcal = Math.max(0, Math.round(-kcalLeftForKibble * 10) / 10);

  return {
    kcalToday,
    kcalMeat,
    kcalLeftForKibble,
    kibbleGrams,
    overLimitKcal,
  };
}
