import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddMealForm } from './AddMealForm';
import type { Food } from '../types';

describe('AddMealForm', () => {
  it('submits grams for gram-based foods and shows kcal preview', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AddMealForm foods={foods} onSubmit={onSubmit} />);

    await user.clear(screen.getByPlaceholderText('Gramatura (g)'));
    await user.type(screen.getByPlaceholderText('Gramatura (g)'), '35');
    expect(screen.getByText('≈ 35 kcal')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Dodaj' }));

    expect(onSubmit).toHaveBeenCalledWith({ foodId: 'food-kibble', grams: 35 });
  });

  it('submits pieces for piece-based treats and keeps one piece valid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AddMealForm foods={foods} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /Karma standardowa/ }));
    await user.click(screen.getByRole('button', { name: /Przysmak/ }));

    const amountInput = screen.getByPlaceholderText('Liczba sztuk');
    expect(amountInput.getAttribute('min')).toBe('0.01');
    expect(amountInput.getAttribute('step')).toBe('0.01');

    await user.type(amountInput, '1');
    expect(screen.getByText('≈ 1.5 kcal')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Dodaj' }));

    expect(onSubmit).toHaveBeenCalledWith({ foodId: 'food-treat', pieces: 1 });
  });

  it('does not submit without a positive amount', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AddMealForm foods={foods} onSubmit={onSubmit} />);

    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Dodaj' }).disabled).toBe(true);
    await user.type(screen.getByPlaceholderText('Gramatura (g)'), '0');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Dodaj' }).disabled).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

const foods: Food[] = [
  {
    id: 'food-kibble',
    name: 'Karma standardowa',
    category: 'KIBBLE',
    kcalPer100g: '100.00',
    unit: 'GRAM',
    kcalPerPiece: null,
    archived: false,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'food-treat',
    name: 'Przysmak',
    category: 'TREAT',
    kcalPer100g: '0.00',
    unit: 'PIECE',
    kcalPerPiece: '1.50',
    archived: false,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
];
