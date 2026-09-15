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
