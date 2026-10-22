"use client";

// The overlay orchestration the admin table and the admin calendar share
// (#153): which of detail/edit/cancel is open for which Booking. One
// Booking at a time — a new open replaces the old one — and the id list
// is the trigger, so a sort or filter re-read keeps the sheet. A close
// keeps the picked booking's id: the sheet's content stays mounted while
// the exit animation plays over it, and a new open replaces it.
import { useCallback, useMemo, useReducer } from "react";
import type { AdminBookingRow } from "@/lib/domain/admin-bookings";

/** One booking-scoped sheet: the Booking and which of the detail view
 * or the edit sheet. The cancel confirm rides beside it. */
interface AdminOverlay {
  bookingId: string;
  kind: "detail" | "edit";
}

export interface AdminOverlayState {
  cancelId: string | null;
  overlay: AdminOverlay | null;
  overlayOpen: boolean;
}

export type AdminOverlayKind = AdminOverlay["kind"];

const INITIAL: AdminOverlayState = {
  cancelId: null,
  overlay: null,
  overlayOpen: false,
};

/** Opens one Booking's sheet — detail or edit — over any other, reopening
 * the mount for the enter animation. */
export function openAdminOverlay(
  state: AdminOverlayState,
  bookingId: string,
  kind: AdminOverlayKind
): AdminOverlayState {
  return { ...state, overlay: { bookingId, kind }, overlayOpen: true };
}

/** The sheet's onOpenChange: only a close means anything — an open that
 * arrives while the sheet is open is noise. The picked booking stays for
 * the exit animation. */
export function closeAdminOverlay(
  state: AdminOverlayState,
  open: boolean
): AdminOverlayState {
  return open ? state : { ...state, overlayOpen: false };
}

/** Picks the Booking the cancel confirm shows, over any open sheet. */
export function openAdminCancel(
  state: AdminOverlayState,
  bookingId: string
): AdminOverlayState {
  return { ...state, cancelId: bookingId };
}

/** Clears the cancel pick; an open sheet stays open. */
export function closeAdminCancel(state: AdminOverlayState): AdminOverlayState {
  return { ...state, cancelId: null };
}

function byId(
  rows: AdminBookingRow[],
  bookingId: string
): AdminBookingRow | null {
  return rows.find((row) => row.bookingId === bookingId) ?? null;
}

/** The row an overlay picked, or null — the id list is the trigger, so a
 * sort re-read keeps the sheet, and a Booking gone from the rows closes
 * the sheet instead of blowing up on a null deref. */
export function overlayRowById(
  rows: AdminBookingRow[],
  overlay: AdminOverlay | null
): AdminBookingRow | null {
  if (overlay === null) {
    return null;
  }
  const found = rows.find((row) => row.bookingId === overlay.bookingId);
  return found ?? null;
}

/** Every kind's row live from the current rows: the detail sheet and the
 * edit sheet only render their own kind's pick, the cancel confirm its
 * own. */
export function overlayRows(
  rows: AdminBookingRow[],
  state: AdminOverlayState
): {
  cancelRow: AdminBookingRow | null;
  detailRow: AdminBookingRow | null;
  editRow: AdminBookingRow | null;
} {
  const kind = state.overlay?.kind;
  return {
    cancelRow: state.cancelId === null ? null : byId(rows, state.cancelId),
    detailRow: kind === "detail" ? overlayRowById(rows, state.overlay) : null,
    editRow: kind === "edit" ? overlayRowById(rows, state.overlay) : null,
  };
}

export interface AdminBookingOverlay {
  cancelRow: AdminBookingRow | null;
  closeCancel: () => void;
  closeOverlay: (open: boolean) => void;
  detailOpen: boolean;
  detailRow: AdminBookingRow | null;
  editOpen: boolean;
  editRow: AdminBookingRow | null;
  openCancel: (bookingId: string) => void;
  openDetail: (bookingId: string) => void;
  openEdit: (bookingId: string) => void;
  overlayOpen: boolean;
}

/** The shared overlay seam: the table opens detail and edit sheets; the
 * calendar's month view opens the detail sheet. Both pick the cancel
 * confirm from the sheet's foot. */
export function useAdminBookingOverlay(
  rows: AdminBookingRow[]
): AdminBookingOverlay {
  const [state, dispatch] = useReducer(
    (
      current: AdminOverlayState,
      action: AdminOverlayAction
    ): AdminOverlayState => {
      switch (action.type) {
        case "close-cancel":
          return closeAdminCancel(current);
        case "close-overlay":
          return closeAdminOverlay(current, action.open);
        case "open-cancel":
          return openAdminCancel(current, action.bookingId);
        case "open-overlay":
          return openAdminOverlay(current, action.bookingId, action.kind);
        default:
          return current;
      }
    },
    INITIAL
  );

  const openOverlay = useCallback(
    (bookingId: string, kind: AdminOverlayKind): void => {
      dispatch({ bookingId, kind, type: "open-overlay" });
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
  const closeOverlay = useCallback(
    (open: boolean): void => dispatch({ open, type: "close-overlay" }),
    []
  );
  const openCancel = useCallback(
    (bookingId: string): void => dispatch({ bookingId, type: "open-cancel" }),
    []
  );
  const closeCancel = useCallback(
    (): void => dispatch({ type: "close-cancel" }),
    []
  );

  const resolved = useMemo(() => overlayRows(rows, state), [rows, state]);

  const activeKind = state.overlay?.kind;

  return {
    cancelRow: resolved.cancelRow,
    closeCancel,
    closeOverlay,
    detailOpen: state.overlayOpen && activeKind === "detail",
    detailRow: resolved.detailRow,
    editOpen: state.overlayOpen && activeKind === "edit",
    editRow: resolved.editRow,
    openCancel,
    openDetail,
    openEdit,
    overlayOpen: state.overlayOpen,
  };
}

type AdminOverlayAction =
  | { type: "close-cancel" }
  | { open: boolean; type: "close-overlay" }
  | { bookingId: string; type: "open-cancel" }
  | { bookingId: string; kind: AdminOverlayKind; type: "open-overlay" };
