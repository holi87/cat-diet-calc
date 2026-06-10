import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, localDateStr, localTimeStr, zonedDayRange } from './dates';

describe('zonedDayRange (Europe/Warsaw)', () => {
  it('uses UTC+1 in winter', () => {
    const { start, end } = zonedDayRange('2026-01-15');
    assert.equal(start.toISOString(), '2026-01-14T23:00:00.000Z');
    assert.equal(end.toISOString(), '2026-01-15T23:00:00.000Z');
  });

  it('uses UTC+2 in summer', () => {
    const { start, end } = zonedDayRange('2026-06-15');
    assert.equal(start.toISOString(), '2026-06-14T22:00:00.000Z');
    assert.equal(end.toISOString(), '2026-06-15T22:00:00.000Z');
  });

  it('handles the spring-forward day (23h long)', () => {
    // DST starts 2026-03-29 in Poland: 02:00 jumps to 03:00
    const { start, end } = zonedDayRange('2026-03-29');
    assert.equal(start.toISOString(), '2026-03-28T23:00:00.000Z');
    assert.equal(end.toISOString(), '2026-03-29T22:00:00.000Z');
  });

  it('handles the fall-back day (25h long)', () => {
    // DST ends 2026-10-25 in Poland: 03:00 falls back to 02:00
    const { start, end } = zonedDayRange('2026-10-25');
    assert.equal(start.toISOString(), '2026-10-24T22:00:00.000Z');
    assert.equal(end.toISOString(), '2026-10-25T23:00:00.000Z');
  });

  it('an entry at 00:30 local lands in the new day, 23:30 local in the old one', () => {
    const { start, end } = zonedDayRange('2026-06-10');
    const halfPastMidnightLocal = new Date('2026-06-09T22:30:00.000Z'); // 00:30 in Warsaw
    const halfPastElevenLocal = new Date('2026-06-10T21:30:00.000Z'); // 23:30 in Warsaw
    assert.equal(halfPastMidnightLocal >= start && halfPastMidnightLocal < end, true);
    assert.equal(halfPastElevenLocal >= start && halfPastElevenLocal < end, true);
    const beforeMidnight = new Date('2026-06-09T21:59:59.000Z'); // 23:59:59 on Jun 9 in Warsaw
    assert.equal(beforeMidnight < start, true);
  });
});

describe('localDateStr / localTimeStr', () => {
  it('maps a late-UTC instant to the next Warsaw day in summer', () => {
    // 2026-06-09 23:30 UTC = 2026-06-10 01:30 in Warsaw
    const at = new Date('2026-06-09T23:30:00.000Z');
    assert.equal(localDateStr(at), '2026-06-10');
    assert.equal(localTimeStr(at), '01:30');
  });

  it('maps a late-UTC instant with the +1 winter offset', () => {
    const at = new Date('2026-01-15T23:30:00.000Z');
    assert.equal(localDateStr(at), '2026-01-16');
    assert.equal(localTimeStr(at), '00:30');
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    assert.equal(addDays('2026-01-31', 1), '2026-02-01');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });
});
