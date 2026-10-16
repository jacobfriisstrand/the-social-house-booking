// The export routes' shared plumbing (#123): the file download response,
// the selection body's gate, and the CSV/PDF branch — the two routes'
// GETs and POSTs differ only in their table, title and window.

import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { messages } from "@/messages/da";
import { toCsv } from "./csv";
import { renderTablePdf } from "./pdf";
import type { ExportTable } from "./table";

/** The route response that downloads `body` as `filename`. */
export function fileResponse(
  body: ArrayBuffer | string,
  filename: string,
  contentType: string
): Response {
  return new Response(body, {
    headers: {
      "content-disposition": `attachment; filename="${filename}"`,
      "content-type": contentType,
    },
  });
}

// The selection body the tables post: the ticked ids and the format. The
// id ceiling is formality — the UI can offer at most a page or two.
const SELECTION_IDS = z.array(z.guid()).min(1).max(10_000);

const bookingsSelectionSchema = z.object({
  bookingIds: SELECTION_IDS,
  format: z.enum(["csv", "pdf"]),
});

const companiesSelectionSchema = z.object({
  companyIds: SELECTION_IDS,
  format: z.enum(["csv", "pdf"]),
});

export const exportSchemas = {
  bookings: bookingsSelectionSchema,
  companies: companiesSelectionSchema,
};

// The selection export's gate and body: the admin guard, then the posted
// ids and format. A Response return means the request is refused.
export async function readExportSelection<S extends z.ZodType>(
  request: Request,
  schema: S
): Promise<z.output<S> | Response> {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return new Response(messages.common.invalidRequest, { status: 400 });
  }
  return parsed.data;
}

// The one CSV/PDF branch both routes serve: the PDF carries the title,
// period and total the caller computed; the CSV is the table verbatim.
export async function exportResponse(
  table: ExportTable,
  options: {
    base: string;
    format: "csv" | "pdf";
    landscape?: boolean;
    note?: string;
    period?: string;
    today: string;
    title: string;
    total?: string;
  }
): Promise<Response> {
  const { base, format, today } = options;
  if (format === "pdf") {
    return fileResponse(
      await renderTablePdf({
        landscape: options.landscape,
        note: options.note,
        period: options.period,
        table,
        title: options.title,
        total: options.total,
      }),
      `${base}-${today}.pdf`,
      "application/pdf"
    );
  }
  return fileResponse(
    toCsv(table),
    `${base}-${today}.csv`,
    "text/csv; charset=utf-8"
  );
}
