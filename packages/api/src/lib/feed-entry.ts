import { calculateKcal } from './calc';

type FeedEntryFood = {
  unit: string;
  kcalPer100g: string;
  kcalPerPiece: string | null;
};

type FeedEntryAmountInput = {
  grams?: number;
  pieces?: number;
};

export type ResolvedFeedEntryAmount = {
  grams: number;
  pieces: number | null;
  kcalCalculated: number;
};

export function resolveFeedEntryAmount(
  food: FeedEntryFood,
  input: FeedEntryAmountInput,
): ResolvedFeedEntryAmount {
  if (food.unit === 'PIECE') {
    if (input.pieces == null || input.pieces <= 0) {
      throw new Error('pieces is required for PIECE-unit food');
    }
    if (food.kcalPerPiece == null) {
      throw new Error('food has no kcal_per_piece set');
    }

    return {
      grams: 0,
      pieces: input.pieces,
      kcalCalculated: Math.round(input.pieces * parseFloat(food.kcalPerPiece) * 10) / 10,
    };
  }

  if (input.grams == null || input.grams <= 0) {
    throw new Error('grams is required for GRAM-unit food');
  }

  return {
    grams: input.grams,
    pieces: null,
    kcalCalculated: calculateKcal(input.grams, parseFloat(food.kcalPer100g)),
  };
}
