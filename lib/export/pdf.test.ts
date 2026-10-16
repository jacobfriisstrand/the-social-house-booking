import { describe, expect, it } from "vitest";
import { renderTablePdf } from "./pdf";
import type { ExportTable } from "./table";

// Renders a real PDF: the header magic pins the format, the size floor
// catches an empty document. The cell text lives in compressed streams —
// the readable check is the route smoke, not this test.
describe("renderTablePdf", () => {
  it("renders a PDF document carrying the table", async () => {
    const table: ExportTable = {
      headers: ["Navn", "Tal"],
      rows: [["Ærø ApS", "625,00"]],
    };
    const pdf = await renderTablePdf({ table, title: "Test" });
    const bytes = new Uint8Array(pdf);
    expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
  });
});
