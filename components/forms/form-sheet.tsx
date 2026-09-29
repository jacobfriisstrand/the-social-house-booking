"use client";

// The create-or-edit side panel around an admin form: the same right-hand
// sheet as rooms, add-ons and companies (DESIGN.md "Other admin pages").
// The trigger is the primary create button or a small outline edit
// button. The form mounts with the sheet, so every open starts from the
// saved values, and closes the sheet once saved.
import { type ReactNode, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface FormSheetCopy {
  createButton: string;
  createTitle: string;
  editLabel: string;
  editTitle: string;
}

const modes = (copy: FormSheetCopy) => ({
  create: {
    title: copy.createTitle,
    trigger: <Button type="button" />,
    triggerLabel: copy.createButton,
  },
  edit: {
    title: copy.editTitle,
    trigger: <Button size="sm" type="button" variant="outline" />,
    triggerLabel: copy.editLabel,
  },
});

export function FormSheet({
  children,
  copy,
  editing,
}: {
  children: (close: () => void) => ReactNode;
  copy: FormSheetCopy;
  editing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const mode = modes(copy)[editing ? "edit" : "create"];

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger render={mode.trigger}>{mode.triggerLabel}</SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{mode.title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-8">{children(close)}</div>
      </SheetContent>
    </Sheet>
  );
}
