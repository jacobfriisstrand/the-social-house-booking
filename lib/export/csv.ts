// The CSV cells for Excel/Numbers (#123): Danish Excel splits on
// semicolons and reads comma decimals, so the file is semicolon-delimited,
// CRLF-terminated (RFC 4180) and carries a UTF-8 BOM so æøå survives the
// import. Numbers auto-detects both.
import type { ExportCell, ExportTable } from "./table";

const QUOTABLE = /[;"\r\n]/;

// A leading =, +, @ or tab would open as a formula in Excel; the quote
// keeps user-entered cells (company names) as text. A leading "-" is the
// exports' own none-placeholder, never user data, and stays bare.
const FORMULA = /^[=+@\t\r]/;

/** One CSV file: the BOM, the header row, one row per entry. */
export function toCsv(table: ExportTable): string {
  const cell = (value: ExportCell): string => {
    const text = value === null ? "" : String(value);
    // The formula prefix goes on BEFORE quoting: Excel evaluates a leading
    // = inside a quoted field too, so the nastiest payload (= plus quotes
    // or semicolons) must not slip through the quote branch unescaped.
    const safe = FORMULA.test(text) ? `'${text}` : text;
    if (QUOTABLE.test(safe)) {
      return `"${safe.replaceAll('"', '""')}"`;
    }
    return safe;
  };
  const lines = [table.headers, ...table.rows].map((cells) =>
    cells.map(cell).join(";")
  );
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
