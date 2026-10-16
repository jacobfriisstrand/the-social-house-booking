import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";
import type { ExportTable } from "./table";

// The CSV cells for Excel/Numbers: Danish Excel splits on semicolon and
// reads comma decimals, so the file is semicolon-delimited (RFC 4180
// otherwise), CRLF-terminated and carries a UTF-8 BOM so æøå survives.
describe("toCsv", () => {
  const table = (
    headers: string[],
    rows: (string | number | null)[][]
  ): ExportTable => ({
    headers,
    rows,
  });

  it("prefixes the UTF-8 BOM", () => {
    expect(toCsv(table(["Navn"], [["Ærø"]])).charCodeAt(0)).toBe(0xfe_ff);
  });

  it("joins cells with semicolons and rows with CRLF, one trailing CRLF", () => {
    expect(
      toCsv(
        table(
          ["a", "b"],
          [
            ["1", "2"],
            ["3", "4"],
          ]
        )
      )
    ).toBe("\uFEFFa;b\r\n1;2\r\n3;4\r\n");
  });

  it("quotes cells carrying the delimiter, a quote or a line break, doubling quotes", () => {
    expect(
      toCsv(table(["h"], [["x;y"], ['sig "hej"'], ["a\nb"], ["plain"]]))
    ).toBe('\uFEFFh\r\n"x;y"\r\n"sig ""hej"""\r\n"a\nb"\r\nplain\r\n');
  });

  it("writes numbers as bare cells and keeps comma decimals unquoted", () => {
    expect(toCsv(table(["h"], [[15], ["625,00"]]))).toBe(
      "\uFEFFh\r\n15\r\n625,00\r\n"
    );
  });

  it("keeps a formula-shaped cell as text even when quoting also applies", () => {
    expect(toCsv(table(["h"], [['=HYPERLINK("http://x");y']]))).toBe(
      '\uFEFFh\r\n"\'=HYPERLINK(""http://x"");y"\r\n'
    );
  });

  it("writes null as an empty cell", () => {
    expect(toCsv(table(["h"], [[null]]))).toBe("\uFEFFh\r\n\r\n");
  });
});
