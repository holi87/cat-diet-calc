/**
 * Day-boundary helpers for the application time zone.
 *
 * The app's notion of a "day" follows Europe/Warsaw wall-clock time, while
 * feed entries are stored as UTC instants (timestamptz). These helpers convert
 * a YYYY-MM-DD day label to the UTC range it covers, and format instants back
 * into local date/time strings.
 */

export const APP_TIME_ZONE = 'Europe/Warsaw';

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let dtf = dtfCache.get(timeZone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    dtfCache.set(timeZone, dtf);
  }
  return dtf;
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallClock(at: Date, timeZone: string): WallClock {
  const parts: Record<string, string> = {};
  for (const part of getFormatter(timeZone).formatToParts(at)) {
    parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Some ICU versions format midnight as "24"
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function tzOffsetMs(at: Date, timeZone: string): number {
  const w = wallClock(at, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  // formatToParts has second precision — truncate the input the same way
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** UTC instant of local midnight starting the given YYYY-MM-DD day. */
export function zonedDayStartUtc(date: string, timeZone: string = APP_TIME_ZONE): Date {
  const naive = new Date(`${date}T00:00:00Z`);
  const guess = new Date(naive.getTime() - tzOffsetMs(naive, timeZone));
  // Re-derive with the guess so DST transitions around midnight resolve correctly
  return new Date(naive.getTime() - tzOffsetMs(guess, timeZone));
}

/** Half-open UTC range [start, end) covering the given local day. */
export function zonedDayRange(
  date: string,
  timeZone: string = APP_TIME_ZONE,
): { start: Date; end: Date } {
  return {
    start: zonedDayStartUtc(date, timeZone),
    end: zonedDayStartUtc(addDays(date, 1), timeZone),
  };
}

/** YYYY-MM-DD of the given instant in the app time zone. */
export function localDateStr(at: Date = new Date(), timeZone: string = APP_TIME_ZONE): string {
  const w = wallClock(at, timeZone);
  return `${w.year}-${pad2(w.month)}-${pad2(w.day)}`;
}

/** HH:MM of the given instant in the app time zone. */
export function localTimeStr(at: Date, timeZone: string = APP_TIME_ZONE): string {
  const w = wallClock(at, timeZone);
  return `${pad2(w.hour)}:${pad2(w.minute)}`;
}

/** Calendar arithmetic on YYYY-MM-DD strings (time-zone independent). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
