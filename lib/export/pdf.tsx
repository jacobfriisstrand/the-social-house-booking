// The export tables' PDF (#123): the same headers and cells the CSV
// carries (one ExportTable, one source of truth). pdfkit's built-in
// Helvetica covers æøå (WinAnsi) and fetches nothing; the landscape
// default fits the bookings table's nine columns. Equal columns, like the
// HTML tables' table-fixed: the columns share the width evenly.
import {
  Document,
  Image,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatDateTime } from "@/lib/format";
import { messages } from "@/messages/da";
import { LOGO_DATA_URI } from "./logo";
import type { ExportTable } from "./table";

// The near-black the site pairs with its primary (--primary-foreground in
// app/globals.css); the letterhead title reads in it.
const BRAND_INK = "#1c1917";

const styles = StyleSheet.create({
  cell: {
    // One shared flex basis per cell: every column gets the same width.
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 8,
    padding: 3,
  },
  head: {
    backgroundColor: "#eee",
    borderBottomWidth: 1,
    borderColor: "#999",
    flexDirection: "row",
  },
  headCell: {
    fontFamily: "Helvetica-Bold",
  },
  letterhead: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  logo: {
    height: 30,
    width: 130,
  },
  meta: {
    color: "#666",
    fontSize: 8,
    marginBottom: 10,
  },
  note: {
    color: "#666",
    fontSize: 8,
    marginTop: 10,
  },
  page: {
    // White by declaration: a viewer or converter that treats the page as
    // transparent (sips) would render black text on its own black.
    backgroundColor: "#fff",
    fontSize: 8,
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  period: {
    fontSize: 10,
    marginBottom: 10,
  },
  row: {
    borderBottomWidth: 0.5,
    borderColor: "#ccc",
    flexDirection: "row",
  },
  title: {
    color: BRAND_INK,
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
  },
  total: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginTop: 10,
  },
});

export interface TablePdfOptions {
  // The bookings table's nine columns need the wide page; the companies
  // table's five fit the portrait one.
  landscape?: boolean;
  note?: string;
  // The covered period, "Periode: …" — the first booking's start through
  // the last one's end; absent on the companies PDF (no bookings).
  period?: string;
  table: ExportTable;
  title: string;
  // The sum line, "I alt: …" — the exported rows' total column; absent on
  // the companies PDF.
  total?: string;
}

/** The table as a one-page-per-few-hundred-rows PDF letter. */
export async function renderTablePdf(
  options: TablePdfOptions
): Promise<ArrayBuffer> {
  const { landscape = false, note, period, table, title, total } = options;
  const buffer = await renderToBuffer(
    <Document title={title}>
      <Page
        orientation={landscape ? "landscape" : "portrait"}
        size="A4"
        style={styles.page}
      >
        <View style={styles.letterhead}>
          <Text style={styles.title}>{title}</Text>
          <Image src={LOGO_DATA_URI} style={styles.logo} />
        </View>
        {period ? <Text style={styles.period}>{period}</Text> : null}
        <Text style={styles.meta}>
          {messages.common.exportedAt(formatDateTime(new Date()))}
        </Text>
        <View style={styles.head}>
          {table.headers.map((header) => (
            <Text key={header} style={[styles.cell, styles.headCell]}>
              {header}
            </Text>
          ))}
        </View>
        {table.rows.map((cells, rowIndex) => (
          // A row never splits across a page; its cells wrap instead.
          // biome-ignore lint/suspicious/noArrayIndexKey: the rows are positional too — a duplicate booking cell row is a legitimate row, there is no stable key.
          <View key={rowIndex} style={styles.row} wrap={false}>
            {cells.map((cell, columnIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a row's cells are positional — the column is the cell's only identity, there is no stable key to reuse.
              <Text key={columnIndex} style={styles.cell}>
                {cell ?? ""}
              </Text>
            ))}
          </View>
        ))}
        {total ? <Text style={styles.total}>{total}</Text> : null}
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </Page>
    </Document>
  );
  // The PDF bytes as a standalone ArrayBuffer: Buffer<ArrayBufferLike> does
  // not satisfy the Response body's ArrayBufferView type, an ArrayBuffer
  // does, and the copy is the PDF's own size.
  return new Uint8Array(buffer).buffer;
}
