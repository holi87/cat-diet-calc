import { describe, expect, it } from 'vitest';
import { daysAgo, localDateStr } from './dates';

describe('localDateStr', () => {
  it('formats the local calendar date as YYYY-MM-DD', () => {
    expect(localDateStr(new Date(2026, 5, 10, 0, 30))).toBe('2026-06-10');
    expect(localDateStr(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01');
  });

  it('uses local time, not UTC — just after local midnight stays on the local day', () => {
    const justAfterMidnight = new Date(2026, 5, 10, 0, 30);
    // toISOString would report the previous day for UTC+ zones
    expect(localDateStr(justAfterMidnight)).toBe('2026-06-10');
  });
});

describe('daysAgo', () => {
  it('daysAgo(1) is today', () => {
    expect(daysAgo(1)).toBe(localDateStr());
  });
});
