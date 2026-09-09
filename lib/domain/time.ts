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

export function cphWallClock(utc: Date): WallClock {
  const parts = cphFormatter.formatToParts(utc);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { hour, minute };
}
