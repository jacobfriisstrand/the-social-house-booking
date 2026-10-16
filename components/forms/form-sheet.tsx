"use client";

// The create-or-edit dialog around an admin form: the same centered
// dialog as rooms, add-ons and companies (DESIGN.md "Other admin pages"),
// converted from the side sheet in #111.
// The trigger is the primary create button or a small outline edit
// button. The form mounts with the dialog, so every open starts from the
// saved values, and closes the dialog once saved.
import type { ReactNode } from "react";
import { useControlledOpen } from "@/components/forms/use-controlled-open";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  onOpenChange,
  open,
}: {
  children: (close: () => void) => ReactNode;
  copy: FormSheetCopy;
  editing: boolean;
  // Controlled mode: the dialog opens from the caller (a row's ⋯ menu
  // opening the edit form) and no trigger renders.
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}) {
  const [currentOpen, setOpen] = useControlledOpen(open, onOpenChange);
  const isControlled = onOpenChange !== undefined;
  const close = (): void => setOpen(false);
  const mode = modes(copy)[editing ? "edit" : "create"];

  return (
    <Dialog onOpenChange={setOpen} open={currentOpen}>
      {isControlled ? null : (
        <DialogTrigger render={mode.trigger}>{mode.triggerLabel}</DialogTrigger>
      )}
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-full gap-0 overflow-y-auto max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode.title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 px-4 pb-8">{children(close)}</div>
      </DialogContent>
    </Dialog>
  );
}
