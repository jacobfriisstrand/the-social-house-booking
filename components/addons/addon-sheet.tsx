"use client";

// The add-on catalogue's create/edit sheet (#7): the general admin edit
// pattern (DESIGN.md) — edit in a sheet on the page, no dedicated route.
import { type ComponentProps, useCallback } from "react";
import {
  AddonForm,
  type AddonFormInitial,
} from "@/components/addons/addon-form";
import { useControlledOpen } from "@/components/forms/use-controlled-open";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { messages } from "@/messages/da";

export function AddonSheet({
  initial,
  onOpenChange,
  open,
  triggerLabel,
  triggerSize = "sm",
  triggerVariant = "outline",
}: {
  // The add-on in edit mode; null in create mode.
  initial: AddonFormInitial | null;
  // Controlled mode: the sheet opens from a row's ⋯ menu, no trigger.
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  triggerLabel: string;
  triggerSize?: ComponentProps<typeof Button>["size"];
  triggerVariant?: ComponentProps<typeof Button>["variant"];
}) {
  const [currentOpen, setOpen] = useControlledOpen(open, onOpenChange);
  const isControlled = onOpenChange !== undefined;
  const close = useCallback((): void => setOpen(false), [setOpen]);

  return (
    <Dialog onOpenChange={setOpen} open={currentOpen}>
      {isControlled ? null : (
        <DialogTrigger
          render={
            <Button size={triggerSize} type="button" variant={triggerVariant} />
          }
        >
          {triggerLabel}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-full gap-0 overflow-y-auto max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? copy.editTitle : copy.createTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 px-4 pb-8">
          <AddonForm initial={initial} onSaved={close} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

const copy = messages.addons;
