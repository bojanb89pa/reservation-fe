export const DEFAULT_TIMEZONE = 'Europe/Belgrade';

function partsInZone(now: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/**
 * Calendar date "today" in the business time zone, as a local-midnight `Date`
 * (so it compares directly against calendar cells built with `new Date(y, m, d)`).
 * Unknown / invalid zones fall back to Europe/Belgrade.
 */
export function businessToday(timezone: string | null | undefined, now: Date = new Date()): Date {
  let p: { year: number; month: number; day: number };
  try {
    p = partsInZone(now, timezone || DEFAULT_TIMEZONE);
  } catch {
    p = partsInZone(now, DEFAULT_TIMEZONE);
  }
  return new Date(p.year, p.month - 1, p.day);
}
