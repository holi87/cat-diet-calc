import { describe, expect, it } from 'vitest';
import {
  CATEGORY_BADGE_COLORS,
  CATEGORY_DOT_COLORS,
  CATEGORY_LABELS,
} from './categories';
import type { FoodCategory } from '../types';

describe('food category constants', () => {
  it('defines labels and colors for every supported category', () => {
    const categories: FoodCategory[] = ['BASE', 'KIBBLE', 'WET_FOOD', 'MEAT', 'TREAT'];

    for (const category of categories) {
      expect(CATEGORY_LABELS[category]).toBeTruthy();
      expect(CATEGORY_BADGE_COLORS[category]).toBeTruthy();
      expect(CATEGORY_DOT_COLORS[category]).toBeTruthy();
    }
  });
});
