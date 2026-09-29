// The shadcn Calendar works in browser-local Date objects; the app keeps
// dates as "yyyy-mm-dd" strings. These convert without a timezone shift.
export function isoToDate(value: string): Date | undefined {
  const [year, month, day] = value.split("-").map(Number);
  if (!(year && month && day)) {
    return undefined;
  }
  return new Date(year, month - 1, day);
}

export function dateToIso(date: Date): string {
  const pad = (part: number): string => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// "yyyy-mm-dd" moved by whole days, in calendar terms (no timezone).
export function addDays(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const moved = new Date(Date.UTC(year, month - 1, day + days));
  return moved.toISOString().slice(0, 10);
}
