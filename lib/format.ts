// Display formatting for money and timestamps.
// Money is integer øre (ADR-0019), all prices excl. VAT (ADR-0020).
// Everything displays in Europe/Copenhagen (ADR-0021).
const oreFormatter = new Intl.NumberFormat("da-DK", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("da-DK", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Copenhagen",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("da-DK", {
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  timeZone: "Europe/Copenhagen",
});

// formatOre(62500) → "625,00 kr", formatOre(120000) → "1.200,00 kr".
export function formatOre(ore: number): string {
  return `${oreFormatter.format(ore / 100)} kr`;
}

// formatKroner(80000) → "800 kr" — whole kroner for cards and chips
// (DESIGN.md: whole kroner with the unit on cards and chips).
export function formatKroner(ore: number): string {
  return `${kronerFormatter.format(ore / 100)} kr`;
}

const kronerFormatter = new Intl.NumberFormat("da-DK", {
  maximumFractionDigits: 0,
});

// formatDateString("2026-12-24") → "24/12/2026" — a bare yyyy-mm-dd date
// (no timezone) as dd/mm/yyyy (DESIGN.md date format).
export function formatDateString(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

// formatDateTime("2026-09-02T17:00:00Z") → "02/09/2026 19:00" (Danish locale writes "19.00"; the spec wants "HH:mm").
export function formatDateTime(instant: Date | string | number): string {
  const date = new Date(instant);
  return `${dateFormatter.format(date).replaceAll(".", "/")} ${timeFormatter.format(date).replace(".", ":")}`;
}

// formatTime("2026-09-02T17:00:00Z") → "19:00".
export function formatTime(instant: Date | string | number): string {
  return timeFormatter.format(new Date(instant)).replace(".", ":");
}

const weekdayFormatter = new Intl.DateTimeFormat("da-DK", {
  timeZone: "Europe/Copenhagen",
  weekday: "long",
});

// formatWeekday("2026-09-02T17:00:00Z") → "onsdag" (lower-case, sentences only).
export function formatWeekday(instant: Date | string | number): string {
  return weekdayFormatter.format(new Date(instant)).toLowerCase();
}

// formatDate("2026-09-02T17:00:00Z") → "02/09/2026".
export function formatDate(instant: Date | string | number): string {
  return dateFormatter.format(new Date(instant)).replaceAll(".", "/");
}
