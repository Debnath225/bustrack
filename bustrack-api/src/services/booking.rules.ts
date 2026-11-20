// Pure helpers with no I/O, so they are easy to unit test.

export interface StopRange {
  start: number;
  end: number;
}

/** Normalises a trip (in either direction) to an ordered segment. Returns null for invalid pairs. */
export function normalizeStopRange(fromStopIndex: number, toStopIndex: number, stopCount: number): StopRange | null {
  if (
    !Number.isInteger(fromStopIndex) ||
    !Number.isInteger(toStopIndex) ||
    fromStopIndex < 0 ||
    toStopIndex < 0 ||
    fromStopIndex >= stopCount ||
    toStopIndex >= stopCount ||
    fromStopIndex === toStopIndex
  ) {
    return null;
  }
  return {
    start: Math.min(fromStopIndex, toStopIndex),
    end: Math.max(fromStopIndex, toStopIndex),
  };
}

/** Service dates follow the India calendar, not UTC. */
export function getIndiaServiceDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function shiftServiceDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function isBusLive(
  status: string,
  lastSeen: Date | string | number | null | undefined,
  staleSeconds: number,
  now = Date.now(),
): boolean {
  if (status !== "active" || !lastSeen) return false;
  const timestamp = new Date(lastSeen).getTime();
  return Number.isFinite(timestamp) && now - timestamp < staleSeconds * 1000;
}

export function calculateTotalFare(unitFare: number, seats: number): number {
  return Math.round(unitFare * seats * 100) / 100;
}
