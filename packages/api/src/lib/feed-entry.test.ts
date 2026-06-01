import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCloseDay, calculateKcal } from './calc';
import { resolveFeedEntryAmount } from './feed-entry';

describe('calculateKcal', () => {
  it('rounds kcal to one decimal place for gram-based foods', () => {
    assert.equal(calculateKcal(35, 85), 29.8);
  });

  it('keeps feed history values stable with explicit calculated kcal', () => {
    assert.equal(calculateKcal(12.5, 114), 14.3);
  });
});

describe('calculateCloseDay', () => {
  it('calculates remaining kibble grams from daily target and meat kcal', () => {
    assert.deepEqual(
      calculateCloseDay({
        kcalToday: 100,
        dailyKcalTarget: 220,
        meatGrams: 40,
        meatKcalPer100g: 114,
        kibbleKcalPer100g: 100,
      }),
      {
        kcalToday: 100,
        kcalMeat: 45.6,
        kcalLeftForKibble: 74.4,
        kibbleGrams: 74.4,
        overLimitKcal: 0,
      },
    );
  });
});

describe('resolveFeedEntryAmount', () => {
  it('calculates kcal for gram-based feed entries', () => {
    assert.deepEqual(
      resolveFeedEntryAmount(
        { unit: 'GRAM', kcalPer100g: '85.00', kcalPerPiece: null },
        { grams: 35 },
      ),
      { grams: 35, pieces: null, kcalCalculated: 29.8 },
    );
  });

  it('calculates kcal for one piece of a 1.5 kcal treat', () => {
    assert.deepEqual(
      resolveFeedEntryAmount(
        { unit: 'PIECE', kcalPer100g: '0.00', kcalPerPiece: '1.50' },
        { pieces: 1 },
      ),
      { grams: 0, pieces: 1, kcalCalculated: 1.5 },
    );
  });

  it('rejects piece-based foods without a piece amount', () => {
    assert.throws(
      () =>
        resolveFeedEntryAmount(
          { unit: 'PIECE', kcalPer100g: '0.00', kcalPerPiece: '1.50' },
          { grams: 1 },
        ),
      /pieces is required/,
    );
  });

  it('rejects piece-based foods without kcal per piece', () => {
    assert.throws(
      () =>
        resolveFeedEntryAmount(
          { unit: 'PIECE', kcalPer100g: '0.00', kcalPerPiece: null },
          { pieces: 1 },
        ),
      /kcal_per_piece/,
    );
  });
});
