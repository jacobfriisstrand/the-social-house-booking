"use client";

// Bookinger (admin), the invoicing list (#9, DESIGN.md "Bookinger
// (admin)"): one booking per row — number, company, room, date, the price
// after discount, status — sortable columns. With rows ticked, the header
// row swaps its column titles for the bulk actions — mark invoiced, not
// invoiced, not invoicable — and swaps back when the selection clears.
// Every booking is
// selectable, a future one too, so it can be refused before it is held;
// the row's ⋯ menu carries the same three actions for one booking. The
// row's numbers beyond those live in the detail sheet (row click or
// ⋯ menu); the ⋯ menu holds the invoice actions and the edit sheet. The
// server and the database re-check every move. Amounts
// integer øre, excl. VAT (ADR-0019, ADR-0020).
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  BanIcon,
  CalendarXIcon,
  EllipsisIcon,
  FileCheckIcon,
  FileXIcon,
  ListIcon,
  PencilIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type MouseEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { AdminCancelDialog } from "@/components/bookings/admin-cancel-dialog";
import { BookingDetailSheet } from "@/components/bookings/booking-detail-sheet";
import { BookingEditSheet } from "@/components/bookings/booking-edit-sheet";
import {
  BookingStatusBadge,
  InvoicingStatusBadge,
} from "@/components/bookings/booking-overview";
import { MarkInvoicedDialog } from "@/components/bookings/mark-invoiced-dialog";
import { TablePagination } from "@/components/pagination/table-pagination";
import { useTablePagination } from "@/components/pagination/use-table-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import type { AdminViewParams } from "@/lib/bookings/admin-view-params";
import { setBookingsInvoicingStatus } from "@/lib/bookings/invoicing-actions";
import {
  type AdminBookingRow,
  type AdminSortKey,
  adminRowParts,
  canAdminCancel,
  invoicingActionAllowance,
  shiftRangeIds,
  sortAdminRows,
} from "@/lib/domain/admin-bookings";
import type { BookingInvoicingStatus } from "@/lib/domain/booking-overview";
import { formatDate, formatOre, formatTime } from "@/lib/format";
import { slicePage } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";

const copy = messages.bookings.admin;
const bookingsCopy = messages.bookings;

/** One row-scoped overlay: which booking and which sheet — the detail
 * view or the edit sheet; the invoice dialog has its own ids state. */
interface Overlay {
  bookingId: string;
  kind: "detail" | "edit";
}

const NONE = "-";

// Frozen empty arrays: the dialogs' bookingIds prop must keep its
// identity across renders or the reset effect wipes the form mid-typing.
const NO_IDS: string[] = [];
const EMPTY_MANUAL_AMOUNTS: AdminBookingRow["manualAmounts"] = [];

// The tick cell and the ⋯ cell opt out of the row's open-detail click;
// the stable identity is the callback-bound lint rule.
const stopRowClick = (event: { stopPropagation: () => void }): void => {
  event.stopPropagation();
};

/** The booking row an id picked, or null — the id list is the trigger, so
 * a sort re-read keeps the open sheet. */
function bookingRowById(
  rows: AdminBookingRow[],
  bookingId: string | null
): AdminBookingRow | null {
  if (bookingId === null) {
    return null;
  }
  return rows.find((row) => row.bookingId === bookingId) ?? null;
}

interface ColumnDef {
  align?: "right";
  key: AdminSortKey;
  label: string;
  // Explicit width in a table-fixed table; the rest share what remains.
  width?: string;
}

// The columns between the first and the last share the width evenly
// (table-fixed); every money column is right-aligned (DESIGN.md
// "Components"). Status first after the checkbox and as narrow as the
// widest badge needs, so the shared columns keep their room; the slim
// list: number, company, room, date, the price after discount — the rest
// of the numbers live in the row's detail sheet, the actions in the ⋯
// menu.
const COLUMNS: ColumnDef[] = [
  { key: "status", label: bookingsCopy.columns.status, width: "w-36" },
  { key: "bookingNumber", label: bookingsCopy.columns.bookingNumber },
  { key: "company", label: copy.columns.company },
  { key: "room", label: bookingsCopy.columns.room },
  { key: "date", label: bookingsCopy.columns.dateTime },
  { key: "addOns", label: bookingsCopy.columns.addOns },
  {
    align: "right",
    key: "memberPrice",
    label: copy.columns.totalPrice,
  },
];

function SortHead({
  column,
  onParamChange,
  params,
}: {
  column: ColumnDef;
  onParamChange: (changes: Partial<AdminViewParams>) => void;
  params: AdminViewParams;
}) {
  const active = params.sort === column.key;
  const nextDir = active && params.sortDir === "asc" ? "desc" : "asc";
  const toggle = useCallback(() => {
    onParamChange({ sort: column.key, sortDir: nextDir });
  }, [onParamChange, column.key, nextDir]);
  let Icon = ArrowUpDownIcon;
  if (active) {
    Icon = params.sortDir === "asc" ? ArrowUpIcon : ArrowDownIcon;
  }
  let ariaSort: "ascending" | "descending" | undefined;
  if (active) {
    ariaSort = params.sortDir === "asc" ? "ascending" : "descending";
  }

  return (
    <TableHead
      aria-sort={ariaSort}
      className={cn(column.width, column.align === "right" && "text-right")}
    >
      <button
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 hover:text-foreground",
          !active && "text-muted-foreground"
        )}
        onClick={toggle}
        type="button"
      >
        {column.label}
        <Icon aria-hidden="true" className="size-3" />
      </button>
    </TableHead>
  );
}

// "Aflys booking" at the foot of the ⋯ menu, for a booking an admin can
// still cancel (canAdminCancel); it opens the confirm dialog.
function CancelMenuItem({
  bookingId,
  canCancel,
  onCancel,
}: {
  bookingId: string;
  canCancel: boolean;
  onCancel: (bookingId: string) => void;
}) {
  const open = useCallback(() => onCancel(bookingId), [onCancel, bookingId]);
  if (!canCancel) {
    return null;
  }
  return (
    <>
      <MenuSeparator />
      <MenuItem
        className="text-destructive data-[highlighted]:text-destructive"
        onClick={open}
      >
        <CalendarXIcon aria-hidden="true" />
        {copy.cancel.action}
      </MenuItem>
    </>
  );
}

// The cancel confirm for the picked booking; nothing while none is picked.
function PickedCancelDialog({
  bookingId,
  onClose,
  rows,
}: {
  bookingId: string | null;
  onClose: () => void;
  rows: AdminBookingRow[];
}) {
  const row = bookingRowById(rows, bookingId);
  return row ? <AdminCancelDialog onClose={onClose} row={row} /> : null;
}

// One row's ⋯ menu (#9): the details view, the three invoice actions,
// the edit sheet and the cancel action in one place — the same actions the bulk header runs,
// just for the one booking. The item matching the row's current status is
// absent (it is already there), and marking invoiced stays off until the
// booking has ended: the dialog carries date and number.
function RowActionsMenu({
  bookingId,
  bookingNumber,
  canCancel,
  canEdit,
  ended,
  invoicingStatus,
  moving,
  onCancel,
  onDetail,
  onEdit,
  onInvoice,
  onMove,
}: {
  bookingId: string;
  bookingNumber: string;
  canCancel: boolean;
  canEdit: boolean;
  ended: boolean;
  invoicingStatus: BookingInvoicingStatus;
  moving: boolean;
  onCancel: (bookingId: string) => void;
  onDetail: (bookingId: string) => void;
  onEdit: (bookingId: string) => void;
  onInvoice: (bookingId: string) => void;
  onMove: (
    bookingIds: string[],
    target: "not_invoiced" | "not_invoicable"
  ) => void;
}) {
  const openDetails = useCallback(
    () => onDetail(bookingId),
    [onDetail, bookingId]
  );
  const openInvoice = useCallback(
    () => onInvoice(bookingId),
    [onInvoice, bookingId]
  );
  const moveToNotInvoiced = useCallback(
    () => onMove([bookingId], "not_invoiced"),
    [onMove, bookingId]
  );
  const moveToNotInvoicable = useCallback(
    () => onMove([bookingId], "not_invoicable"),
    [onMove, bookingId]
  );
  const openEditor = useCallback(() => onEdit(bookingId), [onEdit, bookingId]);
  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            aria-label={copy.actions.open(bookingNumber)}
            size="icon-sm"
            type="button"
            variant="ghost"
          />
        }
      >
        <EllipsisIcon aria-hidden="true" />
      </MenuTrigger>
      <MenuContent>
        <MenuItem onClick={openDetails}>
          <ListIcon aria-hidden="true" />
          {copy.actions.details}
        </MenuItem>
        {invoicingStatus === "invoiced" ? null : (
          <MenuItem disabled={!ended} onClick={openInvoice}>
            <FileCheckIcon aria-hidden="true" />
            {copy.markInvoiced.button}
          </MenuItem>
        )}
        {invoicingStatus === "not_invoiced" ? null : (
          <MenuItem disabled={moving} onClick={moveToNotInvoiced}>
            <FileXIcon aria-hidden="true" />
            {copy.markInvoiced.notInvoicedButton}
          </MenuItem>
        )}
        {invoicingStatus === "not_invoicable" ? null : (
          <MenuItem disabled={moving} onClick={moveToNotInvoicable}>
            <BanIcon aria-hidden="true" />
            {copy.markInvoiced.notInvoicableButton}
          </MenuItem>
        )}
        {canEdit ? (
          <>
            <MenuSeparator />
            <MenuItem onClick={openEditor}>
              <PencilIcon aria-hidden="true" />
              {copy.editLabel}
            </MenuItem>
          </>
        ) : null}
        <CancelMenuItem
          bookingId={bookingId}
          canCancel={canCancel}
          onCancel={onCancel}
        />
      </MenuContent>
    </Menu>
  );
}

function BookingRow({
  row,
  now,
  onCancel,
  onDetail,
  onEdit,
  onInvoice,
  onMove,
  selected,
  toggle,
  moving,
}: {
  row: AdminBookingRow;
  now: Date;
  onCancel: (bookingId: string) => void;
  onDetail: (bookingId: string) => void;
  onEdit: (bookingId: string) => void;
  onInvoice: (bookingId: string) => void;
  onMove: (
    bookingIds: string[],
    target: "not_invoiced" | "not_invoicable"
  ) => void;
  selected: boolean;
  toggle: (bookingId: string, shiftKey: boolean) => void;
  moving: boolean;
}) {
  const parts = adminRowParts(row);
  // The invoice mark waits for the end time; refusing and un-invoicing do
  // not.
  const ended = new Date(row.endAt).getTime() <= now.getTime();
  // Shift-click range selection: the modifier is read in the capture phase
  // on the checkbox root itself — a click there is what triggers the
  // change (the label forwards it to the hidden input, a sibling, whose
  // click would otherwise reset the flag) — and consumed by the change it
  // triggers. Keyboard toggles never pass a click through the root, so
  // the flag stays unset.
  const shiftKey = useRef(false);
  const readShift = useCallback((event: MouseEvent): void => {
    shiftKey.current = event.shiftKey;
  }, []);
  const onToggle = useCallback(() => {
    const shift = shiftKey.current;
    shiftKey.current = false;
    toggle(row.bookingId, shift);
  }, [toggle, row.bookingId]);
  const checkbox = (
    <Checkbox
      aria-label={copy.selection.selectRow(row.bookingNumber)}
      checked={selected}
      onCheckedChange={onToggle}
      onClickCapture={readShift}
    />
  );
  const openRow = useCallback(
    () => onDetail(row.bookingId),
    [onDetail, row.bookingId]
  );
  // The row's total: the room price after discount, or — on a cancelled
  // booking, whose room was never served (ADR-0006) — the payable fee
  // alone. A waived fee leaves nothing to invoice.
  const amountOre =
    parts.memberPriceOre ?? (parts.basisOre === 0 ? null : parts.basisOre);

  return (
    // Clicking the row opens the detail sheet; the tick and the ⋯ menu
    // opt out below.
    <TableRow className="cursor-pointer" onClick={openRow}>
      <TableCell onClick={stopRowClick}>{checkbox}</TableCell>
      <TableCell>
        {/* Every row reserves the fullest badge stack — two badges plus
            the gap between them (2 × h-5 + gap-1 = min-h-11) — so a
            cancelled booking's second badge never makes its row taller
            than the rest; the lone badge centers in the reserved room. */}
        <div className="flex min-h-11 flex-col items-start justify-center gap-1">
          <InvoicingStatusBadge status={row.invoicingStatus} />
          {row.bookingStatus === "cancelled" ? (
            <BookingStatusBadge status={row.bookingStatus} />
          ) : null}
          {/* The invoice date and number live in the detail sheet, not
              here. */}
        </div>
      </TableCell>
      <TableCell className="font-mono">{row.bookingNumber}</TableCell>
      <TableCell className="truncate font-medium">{row.companyName}</TableCell>
      <TableCell className="truncate">{row.roomName}</TableCell>
      <TableCell className="tabular-nums">
        <span className="block">{formatDate(row.startAt)}</span>
        <span className="block text-muted-foreground text-xs">
          {formatTime(row.startAt)} - {formatTime(row.endAt)}
        </span>
      </TableCell>
      {/* The add-ons indicator: "Ja" when the booking carries add-ons —
          the exact lines live in the detail sheet's price panel. */}
      <TableCell>
        {row.addOns.length === 0 ? NONE : bookingsCopy.columns.addOnsYes}
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">
        {amountOre === null ? NONE : formatOre(amountOre)}
      </TableCell>
      <TableCell className="text-right" onClick={stopRowClick}>
        {/* A manual amount documents a held meeting (#16), so a cancelled
            booking — cancelled before it began, its basis the fee alone —
            gets no edit item: the sheet's first setting has nothing to
            offer it. */}
        <RowActionsMenu
          bookingId={row.bookingId}
          bookingNumber={row.bookingNumber}
          canCancel={canAdminCancel(row, now)}
          canEdit={row.bookingStatus !== "cancelled"}
          ended={ended}
          invoicingStatus={row.invoicingStatus}
          moving={moving}
          onCancel={onCancel}
          onDetail={onDetail}
          onEdit={onEdit}
          onInvoice={onInvoice}
          onMove={onMove}
        />
      </TableCell>
    </TableRow>
  );
}

// While the rows re-read, the table keeps its shape: the plain column
// headers (a sort would only queue another re-read), one skeleton row per
// row on the stale page — at least four, so an empty set still shows
// movement — and the pagination footer, whose counts are stale but hold
// the card's height. Bars are uniform: the colgroup owns the widths.
function SkeletonRow() {
  return (
    <TableRow className="h-12">
      <TableCell>
        <Skeleton className="size-4" />
      </TableCell>
      {COLUMNS.map((column) => (
        <TableCell
          className={column.align === "right" ? "text-right" : undefined}
          key={column.key}
        >
          <Skeleton
            className={cn("h-4 w-3/4", column.align === "right" && "ml-auto")}
          />
        </TableCell>
      ))}
      <TableCell className="text-right">
        <Skeleton className="ml-auto size-6" />
      </TableCell>
    </TableRow>
  );
}

export function AdminBookingsTable({
  loading,
  onParamChange,
  params,
  rows,
}: {
  // True while a filter, sort or view change re-reads the rows: skeleton
  // rows instead of the stale ones, the empty state waits.
  loading: boolean;
  // The view's URL write — sort heads included, so a sort rides the same
  // transition and the skeletons and params accumulate in one place.
  onParamChange: (changes: Partial<AdminViewParams>) => void;
  params: AdminViewParams;
  rows: AdminBookingRow[];
}) {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const paged = useTablePagination(rows.length);

  const sorted = useMemo(
    () => sortAdminRows(rows, params.sort, params.sortDir),
    [rows, params.sort, params.sortDir]
  );
  const visible = slicePage(sorted, paged.page, paged.pageSize);

  // The selection holds booking ids; a fresh row set (a filter, a mark, a
  // period change) starts a new selection. The trigger is the id list, not
  // the rows identity: a sort re-reads the same rows and must keep the
  // ticks. The reset runs at render time when the key changes — React's
  // documented pattern for resetting state on a prop change.
  const rowKey = rows.map((row) => row.bookingId).join("\n");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  // The anchor for shift-click ranges: the last clicked row. A fresh row
  // set (a filter, a mark, a period change) starts both over.
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [keyRead, setKeyRead] = useState(rowKey);
  if (rowKey !== keyRead) {
    setKeyRead(rowKey);
    setSelected(new Set());
    setAnchorId(null);
  }

  // Every booking participates — a future one too, so the admin can take
  // it out of the basis before it is held.
  const allSelected =
    sorted.length > 0 && sorted.every((row) => selected.has(row.bookingId));
  const someSelected = sorted.some((row) => selected.has(row.bookingId));
  // The ticked rows decide which bulk action can run — the same rules the
  // server re-checks: the invoice mark needs every row ended and open for
  // an invoice, un-invoicing every row invoiced or refused, refusing any
  // row not already refused, a future booking included.
  const selectedEntries = useMemo(
    () => sorted.filter((row) => selected.has(row.bookingId)),
    [sorted, selected]
  );
  const allowance = useMemo(
    () => invoicingActionAllowance(selectedEntries, now),
    [selectedEntries, now]
  );

  // A plain click toggles one row and becomes the anchor. With shift held
  // it adds the range from the anchor to the clicked row and never
  // unticks; without an anchor on this page it falls back to the plain
  // toggle.
  const toggle = useCallback(
    (bookingId: string, shiftKey: boolean): void => {
      const visibleIds = visible.map((row) => row.bookingId);
      setSelected((current) => {
        const range = shiftKey
          ? shiftRangeIds(visibleIds, anchorId, bookingId)
          : null;
        if (range) {
          return new Set([...current, ...range]);
        }
        const next = new Set(current);
        if (next.has(bookingId)) {
          next.delete(bookingId);
        } else {
          next.add(bookingId);
        }
        return next;
      });
      setAnchorId(bookingId);
    },
    [anchorId, visible]
  );
  const toggleAll = useCallback((): void => {
    setSelected(() =>
      allSelected ? new Set() : new Set(sorted.map((row) => row.bookingId))
    );
  }, [allSelected, sorted]);

  // Shift-click extends the browser's own text selection from the last
  // pressed tick across the range, so the row text lights up alongside
  // the ticks. Cancelling that mousedown default keeps the highlight off
  // while the click still toggles the checkbox.
  const stopShiftTextSelect = useCallback((event: MouseEvent): void => {
    if (
      event.shiftKey &&
      event.target instanceof Element &&
      event.target.closest('[data-slot="checkbox"]') !== null
    ) {
      event.preventDefault();
    }
  }, []);

  // The row-scoped overlays (detail sheet, edit sheet) share one state:
  // the overlay content stays set after close — the exit animation plays
  // over it — and a new open replaces it. `overlayOpen` drives the mount.
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const detailRow = useMemo(
    () =>
      bookingRowById(
        rows,
        overlay?.kind === "detail" ? overlay.bookingId : null
      ),
    [rows, overlay]
  );
  const editRow = useMemo(
    () =>
      bookingRowById(rows, overlay?.kind === "edit" ? overlay.bookingId : null),
    [rows, overlay]
  );
  // The invoice dialog: one instance for the bulk mark and the ⋯ menu's
  // single-row mark. `dialogIds` is set on open only, so its identity —
  // and the dialog's reset effect — stays put while it is open. The
  // dialog labels each per-booking field with its booking number and each
  // company field with the company, so the ids ride with the frozen rows.
  const [dialogIds, setDialogIds] = useState<string[] | null>(null);
  const dialogBookings = useMemo(
    () =>
      (dialogIds ?? NO_IDS).map((bookingId) => {
        const row = bookingRowById(rows, bookingId);
        return {
          bookingId,
          bookingNumber: row?.bookingNumber ?? "",
          companyId: row?.companyId ?? "",
          companyName: row?.companyName ?? "",
        };
      }),
    [dialogIds, rows]
  );
  // One status move for the row menu and the bulk header: the row menu
  // passes the one booking and keeps the selection, the bulk header the
  // whole selection and clears it.
  const [moving, startMoving] = useTransition();
  const move = useCallback(
    (
      bookingIds: string[],
      target: "not_invoiced" | "not_invoicable",
      clear = false
    ): void => {
      startMoving(async () => {
        const result = await setBookingsInvoicingStatus(bookingIds, target);
        if (result.status === "success") {
          toast.add({
            title:
              target === "not_invoiced"
                ? copy.markInvoiced.notInvoicedSaved(bookingIds.length)
                : copy.markInvoiced.notInvoicableSaved,
            type: "success",
          });
          if (clear) {
            setSelected(new Set());
          }
          router.refresh();
          return;
        }
        toast.add({
          title:
            target === "not_invoiced"
              ? copy.markInvoiced.notInvoicedFailed(bookingIds.length)
              : result.error,
          type: "error",
        });
      });
    },
    [router]
  );
  const openOverlay = useCallback(
    (bookingId: string, kind: Overlay["kind"]): void => {
      setOverlay({ bookingId, kind });
      setOverlayOpen(true);
    },
    []
  );
  const openDetail = useCallback(
    (bookingId: string): void => openOverlay(bookingId, "detail"),
    [openOverlay]
  );
  const openEdit = useCallback(
    (bookingId: string): void => openOverlay(bookingId, "edit"),
    [openOverlay]
  );
  // The booking picked for the cancel confirm, if any.
  const [cancelId, setCancelId] = useState<string | null>(null);
  const openCancel = useCallback(
    (bookingId: string): void => setCancelId(bookingId),
    []
  );
  const closeCancel = useCallback((): void => setCancelId(null), []);
  const closeOverlay = useCallback((open: boolean): void => {
    if (!open) {
      setOverlayOpen(false);
    }
  }, []);
  const closeDialog = useCallback((open: boolean): void => {
    if (!open) {
      setDialogIds(null);
    }
  }, []);
  const openBulkDialog = useCallback(
    (): void => setDialogIds([...selected]),
    [selected]
  );
  const openRowInvoice = useCallback(
    (bookingId: string): void => setDialogIds([bookingId]),
    []
  );
  const clearSelection = useCallback((): void => setSelected(new Set()), []);
  const moveSelectedNotInvoiced = useCallback(
    (): void => move([...selected], "not_invoiced", true),
    [move, selected]
  );
  const moveSelectedNotInvoicable = useCallback(
    (): void => move([...selected], "not_invoicable", true),
    [move, selected]
  );

  const selectionCount = selected.size;

  // The table's head is the same in both states — the caption, the column
  // grid, and the header row (the selection's bulk actions included, so a
  // filter change mid-selection keeps its actions reachable) — and is
  // stated once so the loading table cannot drift from the real one.
  const tableCaption = (
    <TableCaption className="sr-only">{copy.tableCaption}</TableCaption>
  );
  const tableHeader = (
    <TableHeader>
      <TableRow>
        <TableHead className="sticky left-0 z-10 w-10">
          <Checkbox
            aria-label={copy.selection.selectAll}
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onCheckedChange={toggleAll}
          />
        </TableHead>
        {selectionCount > 0 ? (
          // The bulk header: the actions stand where the column titles
          // were, and swap back when the selection clears.
          <TableHead colSpan={COLUMNS.length + 1}>
            {/* Left-aligned: the actions start right after the sticky
                checkbox column, reachable even at phone width. */}
            <div className="flex items-center gap-2">
              <p className="whitespace-nowrap text-sm">
                {copy.selection.selected(selectionCount)}
              </p>
              <Button
                disabled={moving || !allowance.canInvoice}
                onClick={openBulkDialog}
                size="sm"
                type="button"
              >
                {copy.markInvoiced.button}
              </Button>
              <Button
                disabled={moving || !allowance.canNotInvoiced}
                onClick={moveSelectedNotInvoiced}
                size="sm"
                type="button"
                variant="outline"
              >
                {copy.markInvoiced.notInvoicedButton}
              </Button>
              <Button
                disabled={moving || !allowance.canNotInvoicable}
                onClick={moveSelectedNotInvoicable}
                size="sm"
                type="button"
                variant="outline"
              >
                {copy.markInvoiced.notInvoicableButton}
              </Button>
              <Button
                aria-label={copy.selection.clear}
                onClick={clearSelection}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <XIcon aria-hidden="true" />
              </Button>
            </div>
          </TableHead>
        ) : (
          <>
            {COLUMNS.map((column) => (
              <SortHead
                column={column}
                key={column.key}
                onParamChange={onParamChange}
                params={params}
              />
            ))}
            <TableHead className="w-14" />
          </>
        )}
      </TableRow>
    </TableHeader>
  );
  // The column grid stated once, up front: table-fixed takes the widths
  // from the cols instead of whichever header row renders first, so the
  // swap between the column titles and the bulk actions cannot shift the
  // columns.
  const columnGrid = (
    <colgroup>
      <col className="w-10" />
      <col className="w-36" />
      <col />
      <col />
      <col />
      <col />
      <col />
      <col />
      <col className="w-14" />
    </colgroup>
  );

  // While the rows re-read: the same head, one skeleton row per row on
  // the stale page (at least four, so an empty set still shows movement),
  // the pagination footer so the card's height holds, and a status line
  // announcing the wait the way the day grid's spinner does.
  if (loading) {
    const skeletonKeys = Array.from(
      { length: Math.max(visible.length, 4) },
      (_, index) => `skeleton-row-${index}`
    );
    return (
      <Card className="min-w-0 gap-0 py-0">
        <p className="sr-only" role="status">
          {messages.common.loading}
        </p>
        <Table aria-busy className="min-w-[58rem] table-fixed">
          {columnGrid}
          {tableCaption}
          {tableHeader}
          <TableBody>
            {skeletonKeys.map((key) => (
              <SkeletonRow key={key} />
            ))}
          </TableBody>
        </Table>
        <CardFooter className="px-2 py-1">
          <TablePagination paged={paged} totalItems={rows.length} />
        </CardFooter>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="py-0">
        <Empty className="border-0 py-16">
          <EmptyHeader>
            <EmptyTitle>{copy.emptyTitle}</EmptyTitle>
            <EmptyDescription>{copy.emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="min-w-0 gap-0 py-0">
        <Table
          className="min-w-[58rem] table-fixed"
          onMouseDownCapture={stopShiftTextSelect}
        >
          {columnGrid}
          {tableCaption}
          {tableHeader}
          <TableBody>
            {visible.map((row) => (
              <BookingRow
                key={row.bookingId}
                moving={moving}
                now={now}
                onCancel={openCancel}
                onDetail={openDetail}
                onEdit={openEdit}
                onInvoice={openRowInvoice}
                onMove={move}
                row={row}
                selected={selected.has(row.bookingId)}
                toggle={toggle}
              />
            ))}
          </TableBody>
        </Table>
        <CardFooter className="px-2 py-1">
          <TablePagination paged={paged} totalItems={rows.length} />
        </CardFooter>
      </Card>

      <MarkInvoicedDialog
        bookings={dialogBookings}
        onDone={clearSelection}
        onOpenChange={closeDialog}
        open={dialogIds !== null}
      />
      <BookingDetailSheet
        onCancel={openCancel}
        onOpenChange={closeOverlay}
        open={overlayOpen && overlay?.kind === "detail"}
        row={detailRow}
      />
      <PickedCancelDialog
        bookingId={cancelId}
        onClose={closeCancel}
        rows={rows}
      />
      <BookingEditSheet
        bookingId={overlay?.kind === "edit" ? overlay.bookingId : ""}
        bookingNumber={editRow?.bookingNumber ?? ""}
        // Fresh form per booking: the manual-amount form bakes the booking
        // id in at init, so a reused instance would post to the previous
        // booking's id.
        key={overlay?.kind === "edit" ? overlay.bookingId : ""}
        manualAmounts={editRow?.manualAmounts ?? EMPTY_MANUAL_AMOUNTS}
        onOpenChange={closeOverlay}
        open={overlayOpen && overlay?.kind === "edit"}
      />
    </div>
  );
}
