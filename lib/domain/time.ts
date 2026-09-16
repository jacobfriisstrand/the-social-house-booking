export interface WallClock {
  hour: number;
  minute: number;
}

const CPH_TIMEZONE = "Europe/Copenhagen";

const cphFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  hour12: false,
  minute: "numeric",
  timeZone: CPH_TIMEZONE,
});

export function toUtc(iso: string): Date {
  return new Date(iso);
}

export function hoursBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return ms / (1000 * 60 * 60);
}

// 30-minute wall-clock options "HH:mm" between the bounds, inclusive.
// 1440 minutes renders as "24:00" (Postgres `time` accepts it) so a room can
// close at midnight.
export function timeOptions(
  stepMinutes: number,
  fromMinutes: number,
  toMinutes: number
): string[] {
  const options: string[] = [];
  for (let m = fromMinutes; m <= toMinutes; m += stepMinutes) {
    const hour = Math.floor(m / 60);
    const minute = m % 60;
    options.push(
      `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    );
  }
  return options;
}

export function cphWallClock(utc: Date): WallClock {
  const parts = cphFormatter.formatToParts(utc);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { hour, minute };
}

const MS_PER_MINUTE = 60_000;

const cphPartsFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  timeZone: CPH_TIMEZONE,
  year: "numeric",
});

// Minutes Copenhagen is ahead of UTC at the given instant (60 or 120).
function cphOffsetMinutes(instant: Date): number {
  const parts = cphPartsFormatter.formatToParts(instant);
  const part = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour") % 24,
    part("minute")
  );
  return Math.round((asUtc - instant.getTime()) / MS_PER_MINUTE);
}

// Copenhagen wall clock ("2026-09-16", "10:00") → the instant (ADR-0021).
// "24:00" is midnight ending the date. The offset is read at the naive
// instant and once more at the corrected one, which settles the DST days.
export function cphToUtc(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const guess = naive - cphOffsetMinutes(new Date(naive)) * MS_PER_MINUTE;
  return new Date(naive - cphOffsetMinutes(new Date(guess)) * MS_PER_MINUTE);
}

// Calendar months ahead, clamped to the last day of a shorter month.
export function addMonths(instant: Date, months: number): Date {
  const result = new Date(instant.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}
