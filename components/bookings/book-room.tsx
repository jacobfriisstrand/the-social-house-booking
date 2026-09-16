"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { messages } from "@/messages/da";
import { BookingDialog, type BookingDialogProps } from "./booking-dialog";

type BookRoomProps = Omit<BookingDialogProps, "onOpenChange" | "open"> & {
  // Opens at once when the page was reached with a pre-filled slot (search
  // results, an empty slot on the day grid).
  defaultOpen: boolean;
};

// "Book nu" on the room detail page, with the booking dialog it opens.
export function BookRoom({ defaultOpen, ...dialog }: BookRoomProps) {
  const [open, setOpen] = useState(defaultOpen);
  const show = useCallback(() => setOpen(true), []);
  return (
    <>
      <Button className="max-md:w-full" onClick={show} size="lg" type="button">
        {messages.rooms.book}
      </Button>
      <BookingDialog {...dialog} onOpenChange={setOpen} open={open} />
    </>
  );
}
