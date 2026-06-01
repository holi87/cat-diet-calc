import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DaySummaryCard } from './DaySummaryCard';

describe('DaySummaryCard', () => {
  it('shows kcal totals and progress below 100%', () => {
    const { container } = render(
      <DaySummaryCard totalKcal={110} dailyKcalTarget={220} remainingKcal={110} />,
    );

    expect(screen.getByText('Zjedzone')).toBeTruthy();
    expect(screen.getAllByText('110')).toHaveLength(2);
    expect(screen.getByText('220')).toBeTruthy();
    expect(container.querySelector('[style="width: 50%;"]')).toBeTruthy();
  });

  it('caps progress at 100% and shows over-limit warning', () => {
    const { container } = render(
      <DaySummaryCard totalKcal={240} dailyKcalTarget={220} remainingKcal={-20} />,
    );

    expect(screen.getByText('Przekroczono limit o 20 kcal')).toBeTruthy();
    expect(container.querySelector('[style="width: 100%;"]')).toBeTruthy();
  });
});
