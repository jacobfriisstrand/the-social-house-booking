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
import { GripVerticalIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AddonActiveButton } from "@/components/addons/addon-active-button";
import { AddonSheet } from "@/components/addons/addon-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { reorderAddons } from "@/lib/addons/actions";
import type { AddonDetail } from "@/lib/addons/data";
import { formatKroner } from "@/lib/format";
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
    <TableCell className="w-56">
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

interface SortableAddonRowProps {
  addon: AddonDetail;
  index: number;
}

// One draggable row: the grip handle is the only drag activator (the
// status badge and the edit/deactivate buttons stay clickable).
function SortableAddonRow({ addon, index }: SortableAddonRowProps) {
  const sortable = useSortable({
    id: addon.addonId,
    index,
    modifiers: [RestrictToVerticalAxis],
  });

  return (
    <TableRow
      className={cn(sortable.isDragging && "opacity-50")}
      ref={sortable.ref}
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
      <TableCell className="w-32">
        {addon.isActive ? (
          <Badge variant="success">{copy.activeLabel}</Badge>
        ) : (
          <Badge variant="destructive">{messages.rooms.inactiveLabel}</Badge>
        )}
      </TableCell>
      <TableCell className="w-40">
        <div className="flex items-center justify-end gap-2 *:basis-1/2">
          <AddonSheet
            initial={{
              addonId: addon.addonId,
              description: addon.description ?? "",
              isActive: addon.isActive,
              name: addon.name,
              priceOre: addon.priceOre,
              pricingModel: addon.pricingModel,
            }}
            triggerLabel={copy.editLabel}
          />
          <AddonActiveButton
            addonId={addon.addonId}
            isActive={addon.isActive}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function AddonTable({ addons }: { addons: AddonDetail[] }) {
  const [rows, setRows] = useState<TableRowData[]>(() =>
    addons.map((addon) => ({ addon, id: addon.addonId }))
  );

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
      const reordered = move(rows, event);
      const ids = reordered.map((row) => row.id);
      if (ids.every((id, index) => id === rows[index]?.id)) {
        return;
      }
      const previous = rows;
      setRows(reordered);
      const result = await reorderAddons(ids);
      if (result.status === "error") {
        setRows(previous);
        toast.add({ title: result.error, type: "error" });
      }
    },
    [rows]
  );

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12" />
            <TableHead>{copy.nameColumn}</TableHead>
            <TableHead className="w-56">{copy.pricingColumn}</TableHead>
            <TableHead className="w-32">{copy.activeColumn}</TableHead>
            <TableHead className="w-40" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <DragDropProvider onDragEnd={handleDragEnd}>
            {rows.map((row, index) => (
              <SortableAddonRow addon={row.addon} index={index} key={row.id} />
            ))}
          </DragDropProvider>
        </TableBody>
      </Table>
    </Card>
  );
}
