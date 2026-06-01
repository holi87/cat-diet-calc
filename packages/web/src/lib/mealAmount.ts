import type { FoodUnit } from '../types';

export type MealAmountInputConfig = {
  placeholder: string;
  min: number;
  step: number;
  inputMode: 'decimal';
};

export function getMealAmountInputConfig(unit: FoodUnit | undefined): MealAmountInputConfig {
  if (unit === 'PIECE') {
    return {
      placeholder: 'Liczba sztuk',
      min: 0.01,
      step: 0.01,
      inputMode: 'decimal',
    };
  }

  return {
    placeholder: 'Gramatura (g)',
    min: 0.1,
    step: 0.1,
    inputMode: 'decimal',
  };
}

export function isValidNumberStep(value: number, min: number, step: number): boolean {
  const precision = Math.max(decimalPlaces(value), decimalPlaces(min), decimalPlaces(step));
  const scale = 10 ** precision;
  const scaledValue = Math.round(value * scale);
  const scaledMin = Math.round(min * scale);
  const scaledStep = Math.round(step * scale);

  return (scaledValue - scaledMin) % scaledStep === 0;
}

function decimalPlaces(value: number): number {
  const [, decimalPart = ''] = String(value).split('.');
  return decimalPart.length;
}
