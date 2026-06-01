import { describe, expect, it } from 'vitest';
import { getMealAmountInputConfig, isValidNumberStep } from './mealAmount';

describe('getMealAmountInputConfig', () => {
  it('keeps one piece valid for piece-based treats', () => {
    const config = getMealAmountInputConfig('PIECE');

    expect(config.placeholder).toBe('Liczba sztuk');
    expect(isValidNumberStep(1, config.min, config.step)).toBe(true);
  });

  it('allows fractional piece amounts supported by the API scale', () => {
    const config = getMealAmountInputConfig('PIECE');

    expect(isValidNumberStep(0.5, config.min, config.step)).toBe(true);
  });

  it('keeps decimal grams valid for gram-based foods', () => {
    const config = getMealAmountInputConfig('GRAM');

    expect(config.placeholder).toBe('Gramatura (g)');
    expect(isValidNumberStep(12.5, config.min, config.step)).toBe(true);
  });
});
