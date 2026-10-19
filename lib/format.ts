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

// formatKronerDecimal(62500) → "625,00" — kroner with comma decimals and
// no grouping or unit, the form spreadsheet cells can sum (the exports,
// #123): da-DK decimals without the " kr" unit and the thousands dots.
const kronerDecimalFormatter = new Intl.NumberFormat("da-DK", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  useGrouping: false,
});

export function formatKronerDecimal(ore: number): string {
  return kronerDecimalFormatter.format(ore / 100);
}

const kronerFormatter = new Intl.NumberFormat("da-DK", {
  maximumFractionDigits: 0,
});

// formatDateString("2026-12-24") → "24/12/2026" — a bare yyyy-mm-dd date
// (no timezone) as d/m/yyyy (DESIGN.md date format; not zero-padded).
export function formatDateString(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

// formatDateRange("2026-10-01", "2026-10-31") → "1/10 – 31/10 2026"; the
// years differ → "1/10/2026 – 31/12/2026", a single day to "1/10/2026".
// The overview headers' period label.
export function formatDateRange(from: string, to: string): string {
  if (from === to) {
    return formatDateString(from);
  }
  const [fy, fm, fd] = from.split("-");
  const [ty, tm, td] = to.split("-");
  const year = fy === ty ? ` ${ty}` : ` ${fy} – ${formatDateString(to)}`;
  return `${fd}/${fm} – ${td}/${tm}${year}`;
}

// formatMonthYear("2026-10-01") → "oktober 2026" — a bare yyyy-mm-dd
// date's month and year, for period titles.
export function formatMonthYear(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("da-DK", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, (month ?? 1) - 1, 1)));
}

// formatDateTime("2026-09-02T17:00:00Z") → "02/09/2026 19:00" (Danish locale writes "19.00"; the spec wants "HH:mm").
export function formatDateTime(instant: Date | string | number): string {
  return `${formatDate(instant)} ${formatTime(instant)}`;
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

const monthFormatter = new Intl.DateTimeFormat("da-DK", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

const shortMonthFormatter = new Intl.DateTimeFormat("da-DK", {
  month: "short",
  timeZone: "UTC",
});

const monthStart = (month: string): Date => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1));
};

// formatMonth("2026-09") → "september 2026".
export function formatMonth(month: string): string {
  return monthFormatter.format(monthStart(month));
}

// formatShortMonth("2026-09") → "sep" (chart axes; Danish adds a dot).
export function formatShortMonth(month: string): string {
  return shortMonthFormatter.format(monthStart(month)).replace(".", "");
}

const decimalFormatter = new Intl.NumberFormat("da-DK", {
  maximumFractionDigits: 1,
});

// formatNumber(148.5) → "148,5", formatNumber(1200) → "1.200".
export function formatNumber(value: number): string {
  return decimalFormatter.format(value);
}

const changeFormatter = new Intl.NumberFormat("da-DK", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
  style: "percent",
});

// formatChange(0.121) → "+12,1 %", formatChange(-0.05) → "-5 %".
export function formatChange(fraction: number): string {
  return changeFormatter.format(fraction);
}

const shareFormatter = new Intl.NumberFormat("da-DK", {
  maximumFractionDigits: 0,
  style: "percent",
});

// formatShare(0.684) → "68 %".
export function formatShare(fraction: number): string {
  return shareFormatter.format(fraction);
}

const hoursFormatter = new Intl.NumberFormat("da-DK", {
  maximumFractionDigits: 2,
});

// formatHours(150) → "2,5 t" — billable hours as a Danish decimal.
export function formatHours(minutes: number): string {
  return `${hoursFormatter.format(minutes / 60)} t`;
}
