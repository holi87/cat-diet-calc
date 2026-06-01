import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getMealAmountInputConfig, isValidNumberStep } from './mealAmount';

describe('getMealAmountInputConfig', () => {
  it('keeps one piece valid for piece-based treats', () => {
    const config = getMealAmountInputConfig('PIECE');

    assert.equal(config.placeholder, 'Liczba sztuk');
    assert.equal(isValidNumberStep(1, config.min, config.step), true);
  });

  it('allows fractional piece amounts supported by the API scale', () => {
    const config = getMealAmountInputConfig('PIECE');

    assert.equal(isValidNumberStep(0.5, config.min, config.step), true);
  });

  it('keeps decimal grams valid for gram-based foods', () => {
    const config = getMealAmountInputConfig('GRAM');

    assert.equal(config.placeholder, 'Gramatura (g)');
    assert.equal(isValidNumberStep(12.5, config.min, config.step), true);
  });
});
