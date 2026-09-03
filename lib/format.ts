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

// formatDateTime("2026-09-02T17:00:00Z") → "02/09/2026 19:00" (Danish locale writes "19.00"; the spec wants "HH:mm").
export function formatDateTime(instant: Date | string | number): string {
  const date = new Date(instant);
  return `${dateFormatter.format(date).replaceAll(".", "/")} ${timeFormatter.format(date).replace(".", ":")}`;
}
