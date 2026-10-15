"use client";

// A block on the day grid, opened (DESIGN.md "Day grid"): the sheet shows
// the lines the viewer may see — prepared server-side in
// lib/notice-board/view.ts — and, for an admin, the frozen price.
import { DetailRow } from "@/components/bookings/detail-row";
import { PriceOverview } from "@/components/bookings/price-overview";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { GridEntryView } from "@/lib/notice-board/view";
import { messages } from "@/messages/da";

const copy = messages.home;

export function EntrySheet({
  entry,
  onOpenChange,
  open,
}: {
  entry: GridEntryView | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  if (!entry) {
    return null;
  }
  const isEvent = entry.kind === "house_event";
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{entry.name}</SheetTitle>
          <SheetDescription>
            {isEvent ? (
              <Badge variant="info">{copy.houseEventBadge}</Badge>
            ) : (
              copy.sheet.bookingTitle
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-8">
          <dl className="flex flex-col">
            {entry.details.map((line) => (
              <DetailRow
                key={line.label}
                label={line.label}
                mono={line.mono}
                value={line.value}
              />
            ))}
          </dl>
          {entry.price ? <PriceOverview model={entry.price} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
