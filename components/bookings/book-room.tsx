"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { messages } from "@/messages/da";
import { BookingDialog, type BookingDialogProps } from "./booking-dialog";

type BookRoomProps = Omit<BookingDialogProps, "onOpenChange" | "open">;

// "Book nu" on the room detail page, with the booking dialog it opens. The
// dialog never opens by itself: arriving from a search shows the room
// first, and "Book nu" then opens the dialog with the search pre-filled.
export function BookRoom(dialog: BookRoomProps) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  return (
    <>
      <Button onClick={show} size="lg" type="button">
        {messages.rooms.book}
      </Button>
      <BookingDialog {...dialog} onOpenChange={setOpen} open={open} />
    </>
  );
}
