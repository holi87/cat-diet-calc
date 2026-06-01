import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeedEntryList } from './FeedEntryList';
import type { FeedEntry } from '../types';

describe('FeedEntryList', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders an empty state', () => {
    render(<FeedEntryList entries={[]} onDelete={vi.fn()} />);

    expect(screen.getByText('Brak posiłków. Dodaj pierwszy!')).toBeTruthy();
  });

  it('renders piece-based feed entries with pieces instead of grams', () => {
    render(<FeedEntryList entries={[pieceEntry]} onDelete={vi.fn()} />);

    expect(screen.getByText('Przysmak')).toBeTruthy();
    expect(screen.getByText('1 szt.')).toBeTruthy();
    expect(screen.getByText('1.5 kcal')).toBeTruthy();
  });

  it('groups close-day dinner entries and deletes confirmed entries', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    render(<FeedEntryList entries={[meatEntry, kibbleEntry]} onDelete={onDelete} />);

    expect(screen.getByText('🍽️ Kolacja')).toBeTruthy();
    expect(screen.getByText('120 kcal')).toBeTruthy();
    expect(screen.getByText(/Królik: 40g/)).toBeTruthy();
    expect(screen.getByText(/Baza: 74.4g/)).toBeTruthy();

    await user.click(screen.getByTitle('Usuń karmę'));

    expect(onDelete).toHaveBeenCalledWith('entry-kibble');
  });
});

const baseEntry: FeedEntry = {
  id: 'entry-base',
  catId: 'cat-1',
  datetime: '2026-06-01T08:00:00.000Z',
  foodId: 'food-1',
  foodName: 'Karma',
  foodCategory: 'KIBBLE',
  foodUnit: 'GRAM',
  grams: '10.00',
  pieces: null,
  kcalCalculated: '10.00',
  note: null,
  createdAt: '2026-06-01T08:00:00.000Z',
};

const pieceEntry: FeedEntry = {
  ...baseEntry,
  id: 'entry-piece',
  foodId: 'food-treat',
  foodName: 'Przysmak',
  foodCategory: 'TREAT',
  foodUnit: 'PIECE',
  grams: '0.00',
  pieces: '1.00',
  kcalCalculated: '1.50',
};

const meatEntry: FeedEntry = {
  ...baseEntry,
  id: 'entry-meat',
  foodId: 'food-meat',
  foodName: 'Królik',
  foodCategory: 'MEAT',
  grams: '40.00',
  kcalCalculated: '45.60',
  note: 'kolacja:mięso',
};

const kibbleEntry: FeedEntry = {
  ...baseEntry,
  id: 'entry-kibble',
  foodId: 'food-base',
  foodName: 'Baza',
  foodCategory: 'BASE',
  grams: '74.40',
  kcalCalculated: '74.40',
  note: 'kolacja:karma',
};
