"use client";

import { RestrictToVerticalAxis } from "@dnd-kit/abstract/modifiers";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
// The add-on catalogue table (Tilkøb, admin, #7): rows are draggable by
// their grip handle (a headerless column to the far left) so the admin
// sets display order without a form field. Each drag persists via
// reorderAddons and snaps back on failure. The price cell shows the amount
// and the fixed-vs-per-participant badge on one row (ADR-0011); House
// Service and House Host are plain add-ons whose guidance lives in the
// description (ADR-0015). Same @dnd-kit pattern as the room image list.
import {
  BanIcon,
  CircleCheckIcon,
  EllipsisIcon,
  GripVerticalIcon,
  PencilIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AddonSheet } from "@/components/addons/addon-sheet";
import { useActiveToggleAction } from "@/components/forms/active-toggle-button";
import { openRowWith } from "@/components/forms/open-row-with";
import { TablePagination } from "@/components/pagination/table-pagination";
import { useTablePagination } from "@/components/pagination/use-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { reorderAddons, setAddonActive } from "@/lib/addons/actions";
import type { AddonDetail } from "@/lib/addons/data";
import { formatKroner } from "@/lib/format";
import { slicePage } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";

const copy = messages.addons;

// The row carries the dnd-kit sortable id alongside the add-on.
interface TableRowData {
  addon: AddonDetail;
  id: string;
}

function PricingCell({ addon }: { addon: AddonDetail }) {
  return (
    <TableCell>
      <div className="flex items-center gap-2">
        <span className="tabular-nums">{formatKroner(addon.priceOre)}</span>
        <Badge variant="outline">
          {addon.pricingModel === "per_participant"
            ? copy.fields.pricingModelPerParticipantShort
            : copy.fields.pricingModelFixedShort}
        </Badge>
      </div>
    </TableCell>
  );
}

// Name only — descriptions live on the reference form and in the booking
// flow, not in the catalogue table row. No house badges: those add-ons are
// plain rows like any other (ADR-0015).
function NameCell({ addon }: { addon: AddonDetail }) {
  return <TableCell className="font-medium">{addon.name}</TableCell>;
}

// One row's ⋯ menu, the bookings list's pattern: the edit sheet and the
// active toggle in one place. The toggle is reversible (no confirm); the
// drag grip stays outside, in its own cell.
function AddonRowMenu({
  addon,
  onEdit,
}: {
  addon: AddonDetail;
  onEdit: (addon: AddonDetail) => void;
}) {
  const { pending, run } = useActiveToggleAction(
    setAddonActive,
    copy.statusUpdated
  );
  const edit = useCallback(() => onEdit(addon), [onEdit, addon]);
  const toggle = useCallback(
    () => run(addon.addonId, !addon.isActive),
    [addon, run]
  );

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            aria-label={copy.actions.open(addon.name)}
            size="icon-sm"
            type="button"
            variant="ghost"
          />
        }
      >
        <EllipsisIcon aria-hidden="true" />
      </MenuTrigger>
      <MenuContent>
        <MenuItem onClick={edit}>
          <PencilIcon aria-hidden="true" />
          {copy.editLabel}
        </MenuItem>
        <MenuItem disabled={pending} onClick={toggle}>
          {addon.isActive ? (
            <BanIcon aria-hidden="true" />
          ) : (
            <CircleCheckIcon aria-hidden="true" />
          )}
          {addon.isActive ? copy.deactivate : copy.activate}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

interface SortableAddonRowProps {
  addon: AddonDetail;
  index: number;
  onEdit: (addon: AddonDetail) => void;
}

// One draggable row: the grip handle is the only drag activator (the
// status badge and the actions menu stay clickable).
function SortableAddonRow({ addon, index, onEdit }: SortableAddonRowProps) {
  const sortable = useSortable({
    id: addon.addonId,
    index,
    modifiers: [RestrictToVerticalAxis],
  });

  return (
    <TableRow
      className={cn("cursor-pointer", sortable.isDragging && "opacity-50")}
      ref={sortable.ref}
      tabIndex={0}
      {...openRowWith(addon, onEdit)}
    >
      <TableCell className="w-12">
        <Button
          aria-label={copy.sortOrderDragHandle}
          className="cursor-grab active:cursor-grabbing"
          ref={sortable.handleRef}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <GripVerticalIcon aria-hidden="true" />
        </Button>
      </TableCell>
      <NameCell addon={addon} />
      <PricingCell addon={addon} />
      <TableCell>
        {addon.isActive ? (
          <Badge variant="success">{copy.activeLabel}</Badge>
        ) : (
          <Badge variant="destructive">{messages.rooms.inactiveLabel}</Badge>
        )}
      </TableCell>
      <TableCell className="w-14">
        <AddonRowMenu addon={addon} onEdit={onEdit} />
      </TableCell>
    </TableRow>
  );
}

export function AddonTable({ addons }: { addons: AddonDetail[] }) {
  const [rows, setRows] = useState<TableRowData[]>(() =>
    addons.map((addon) => ({ addon, id: addon.addonId }))
  );
  const paged = useTablePagination(rows.length);
  const start = (paged.page - 1) * paged.pageSize;
  const visible = slicePage(rows, paged.page, paged.pageSize);
  // The row's ⋯ menu opens the edit sheet: the picked add-on rides here,
  // the sheet mounts its form fresh on every open.
  const [editing, setEditing] = useState<AddonDetail | null>(null);
  const openEditor = useCallback(
    (addon: AddonDetail): void => setEditing(addon),
    []
  );
  const closeEditor = useCallback((open: boolean) => {
    if (!open) {
      setEditing(null);
    }
  }, []);

  // Pick up refreshed add-ons (edit, status toggle) without resetting the
  // drag order — the persisted order equals the server's order.
  useEffect(() => {
    setRows((current) => {
      const position = new Map(current.map((row, index) => [row.id, index]));
      return [...addons]
        .sort(
          (a, b) =>
            (position.get(a.addonId) ?? Number.MAX_SAFE_INTEGER) -
            (position.get(b.addonId) ?? Number.MAX_SAFE_INTEGER)
        )
        .map((addon) => ({ addon, id: addon.addonId }));
    });
  }, [addons]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent): Promise<void> => {
      // The sortable indices count the visible page, so the drag reorders
      // that segment of the full list: rows outside the page keep their
      // places, and the full order is what persists.
      const reorderedVisible = move(visible, event);
      const moved = reorderedVisible.some(
        (row, index) => row.id !== visible[index]?.id
      );
      if (!moved) {
        return;
      }
      const previous = rows;
      const next = [...previous];
      reorderedVisible.forEach((row, index) => {
        next[start + index] = row;
      });
      setRows(next);
      const result = await reorderAddons(next.map((row) => row.id));
      if (result.status === "error") {
        setRows(previous);
        toast.add({ title: result.error, type: "error" });
      }
    },
    [rows, start, visible]
  );

  return (
    <>
      <Card className="gap-0 py-0">
        <Table className="min-w-[48rem] table-fixed" sticky>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>{copy.nameColumn}</TableHead>
              <TableHead>{copy.pricingColumn}</TableHead>
              <TableHead>{copy.activeColumn}</TableHead>
              <TableHead className="w-14" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <DragDropProvider onDragEnd={handleDragEnd}>
              {visible.map((row, index) => (
                <SortableAddonRow
                  addon={row.addon}
                  index={index}
                  key={row.id}
                  onEdit={openEditor}
                />
              ))}
            </DragDropProvider>
          </TableBody>
        </Table>
        <CardFooter className="px-2 py-1">
          <TablePagination paged={paged} totalItems={rows.length} />
        </CardFooter>
      </Card>
      {/* The rows' edit sheet, opened from the ⋯ menu. */}
      <AddonSheet
        initial={
          editing
            ? {
                addonId: editing.addonId,
                description: editing.description ?? "",
                isActive: editing.isActive,
                name: editing.name,
                priceOre: editing.priceOre,
                pricingModel: editing.pricingModel,
              }
            : null
        }
        onOpenChange={closeEditor}
        open={editing !== null}
        triggerLabel={copy.editLabel}
      />
    </>
  );
}
