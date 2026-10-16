"use client";

// A block on the day grid, opened (DESIGN.md "Day grid"): the sheet shows
// the lines the viewer may see — prepared server-side in
// lib/notice-board/view.ts — and, for an admin, the frozen price.
import { DetailRow } from "@/components/bookings/detail-row";
import { PriceOverview } from "@/components/bookings/price-overview";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-full gap-0 overflow-y-auto max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{entry.name}</DialogTitle>
          <DialogDescription>
            {isEvent ? (
              <Badge variant="info">{copy.houseEventBadge}</Badge>
            ) : (
              copy.sheet.bookingTitle
            )}
          </DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
