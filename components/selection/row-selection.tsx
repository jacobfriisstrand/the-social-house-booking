"use client";

// The tick-and-range selection the admin tables share (#123): the bookings
// list introduced it, the companies list reuses it. The ticks hold ids; a
// fresh row set (resetOn) starts a new selection — the trigger is the id
// list, not the rows' identity, so a sort re-read keeps the ticks. The
// reset runs at render time when the key changes — React's documented
// pattern for resetting state on a prop change. Shift-click adds the
// range from the last tick within the visible page and never unticks;
// toggleAll reaches the whole selectable set.
import { type MouseEvent, useCallback, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { shiftRangeIds } from "@/lib/domain/admin-bookings";

// The selection state the admin tables share: the ticks, the derived
// flags the header reads, and the handlers — one contract for the
// bookings and the companies lists.
export interface RowSelection<T> {
  allSelected: boolean;
  clearSelection: () => void;
  selected: ReadonlySet<string>;
  selectedEntries: T[];
  someSelected: boolean;
  stopShiftTextSelect: (event: MouseEvent) => void;
  toggle: (id: string, shiftKey: boolean) => void;
  toggleAll: () => void;
}

export function useRowSelection<T>(
  resetOn: readonly string[],
  selectable: readonly T[],
  visible: readonly T[],
  getId: (item: T) => string
): RowSelection<T> {
  const rowKey = resetOn.join("\n");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  // The anchor for shift-click ranges: the last clicked row. A fresh row
  // set starts it over with the ticks.
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [keyRead, setKeyRead] = useState(rowKey);
  if (rowKey !== keyRead) {
    setKeyRead(rowKey);
    setSelected(new Set());
    setAnchorId(null);
  }

  const allSelected =
    selectable.length > 0 &&
    selectable.every((item) => selected.has(getId(item)));
  const someSelected = selectable.some((item) => selected.has(getId(item)));
  const selectedEntries = selectable.filter((item) =>
    selected.has(getId(item))
  );

  const toggle = useCallback(
    (id: string, shiftKey: boolean): void => {
      const visibleIds = visible.map(getId);
      setSelected((current) => {
        const range = shiftKey ? shiftRangeIds(visibleIds, anchorId, id) : null;
        if (range) {
          return new Set([...current, ...range]);
        }
        const next = new Set(current);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      setAnchorId(id);
    },
    [anchorId, visible, getId]
  );
  const toggleAll = useCallback((): void => {
    setSelected(() =>
      allSelected ? new Set() : new Set(selectable.map(getId))
    );
  }, [allSelected, selectable, getId]);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

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

  return {
    allSelected,
    clearSelection,
    selected,
    selectedEntries,
    someSelected,
    stopShiftTextSelect,
    toggle,
    toggleAll,
  };
}

// One row's tick: the shift modifier is read in the capture phase on the
// checkbox root itself — a click there is what triggers the change (the
// label forwards it to the hidden input, a sibling, whose click would
// otherwise reset the flag) — and consumed by the change it triggers.
// Keyboard toggles never pass a click through the root, so the flag stays
// unset.
export function RowTick({
  checked,
  id,
  label,
  toggle,
}: {
  checked: boolean;
  id: string;
  label: string;
  toggle: (id: string, shiftKey: boolean) => void;
}) {
  const shiftKey = useRef(false);
  const readShift = useCallback((event: MouseEvent): void => {
    shiftKey.current = event.shiftKey;
  }, []);
  const onToggle = useCallback(() => {
    const shift = shiftKey.current;
    shiftKey.current = false;
    toggle(id, shift);
  }, [toggle, id]);
  return (
    <Checkbox
      aria-label={label}
      checked={checked}
      onCheckedChange={onToggle}
      onClickCapture={readShift}
    />
  );
}
