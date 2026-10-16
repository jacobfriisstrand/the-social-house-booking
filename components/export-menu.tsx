"use client";

import { DownloadIcon } from "lucide-react";
// The admin tables' export menus (#123): the header menu navigates to the
// export routes, whose Content-Disposition starts the download — the CSV
// for Excel/Numbers, the PDF for print and sharing; the bookings href
// carries the page's filters in its search. The selection menu serves the
// ticked bookings: it POSTs the ids in display order and hands the
// response to the browser as a download.
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { toast } from "@/components/ui/toast";
import { messages } from "@/messages/da";

const FILENAME_RE = /filename="([^"]+)"/;

async function downloadSelection(
  endpoint: string,
  bodyKey: "bookingIds" | "companyIds",
  fallbackBase: string,
  ids: string[],
  format: "csv" | "pdf"
): Promise<void> {
  const response = await fetch(endpoint, {
    body: JSON.stringify({ [bodyKey]: ids, format }),
    credentials: "include",
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`export failed: ${response.status}`);
  }
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename =
    FILENAME_RE.exec(disposition)?.[1] ?? `${fallbackBase}.${format}`;
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// The ticked rows' export, in the bulk header beside the table's own bulk
// actions: the ids keep the displayed order, so the file reads like the
// table does.
export function ExportSelectionMenu({
  bodyKey,
  endpoint,
  fallbackBase,
  ids,
}: {
  bodyKey: "bookingIds" | "companyIds";
  endpoint: string;
  fallbackBase: string;
  ids: string[];
}) {
  const [pending, setPending] = useState(false);
  const download = useCallback(
    (format: "csv" | "pdf"): void => {
      setPending(true);
      downloadSelection(endpoint, bodyKey, fallbackBase, ids, format)
        .catch(() =>
          toast.add({ title: messages.common.exportFailed, type: "error" })
        )
        .finally(() => setPending(false));
    },
    [bodyKey, endpoint, fallbackBase, ids]
  );
  const downloadCsv = useCallback(() => download("csv"), [download]);
  const downloadPdf = useCallback(() => download("pdf"), [download]);
  return (
    <Menu>
      <MenuTrigger
        render={<Button disabled={pending} size="sm" variant="outline" />}
      >
        <DownloadIcon aria-hidden="true" data-icon="inline-start" />
        {messages.common.export}
      </MenuTrigger>
      <MenuContent>
        <MenuItem onClick={downloadCsv}>{messages.common.exportCsv}</MenuItem>
        <MenuItem onClick={downloadPdf}>{messages.common.exportPdf}</MenuItem>
      </MenuContent>
    </Menu>
  );
}

export function ExportMenu({ href }: { href: string }) {
  const withFormat = (format: "csv" | "pdf"): string =>
    href.includes("?")
      ? `${href}&format=${format}`
      : `${href}?format=${format}`;
  return (
    <Menu>
      <MenuTrigger render={<Button variant="outline" />}>
        <DownloadIcon aria-hidden="true" data-icon="inline-start" />
        {messages.common.export}
      </MenuTrigger>
      <MenuContent>
        <MenuItem render={<a href={withFormat("csv")} />}>
          {messages.common.exportCsv}
        </MenuItem>
        <MenuItem render={<a href={withFormat("pdf")} />}>
          {messages.common.exportPdf}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
