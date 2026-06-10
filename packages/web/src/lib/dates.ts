/** YYYY-MM-DD of the given date in the browser's local time zone (not UTC). */
export function localDateStr(d: Date = new Date()): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Local date string n-1 days before today (daysAgo(1) === today). */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n + 1);
  return localDateStr(d);
}
