"use client";

// The create-or-edit dialog around an admin form (DESIGN.md "Opslag
// (admin)"): the primary create button or a small outline edit button, the
// matching title, and the form, which mounts with the dialog so every open
// starts from the saved values. The form closes the dialog once saved.
import { type ReactNode, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface FormDialogCopy {
  createButton: string;
  createTitle: string;
  editLabel: string;
  editTitle: string;
}

const modes = (copy: FormDialogCopy) => ({
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

export function FormDialog({
  children,
  copy,
  editing,
}: {
  children: (close: () => void) => ReactNode;
  copy: FormDialogCopy;
  editing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const mode = modes(copy)[editing ? "edit" : "create"];

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={mode.trigger}>{mode.triggerLabel}</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode.title}</DialogTitle>
        </DialogHeader>
        {children(close)}
      </DialogContent>
    </Dialog>
  );
}
