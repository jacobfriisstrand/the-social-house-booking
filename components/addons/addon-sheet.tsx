"use client";

// The add-on catalogue's create/edit sheet (#7): the general admin edit
// pattern (DESIGN.md) — edit in a sheet on the page, no dedicated route.
import { type ComponentProps, useCallback, useState } from "react";
import {
  AddonForm,
  type AddonFormInitial,
} from "@/components/addons/addon-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { messages } from "@/messages/da";

export function AddonSheet({
  initial,
  triggerLabel,
  triggerSize = "sm",
  triggerVariant = "outline",
}: {
  // The add-on in edit mode; null in create mode.
  initial: AddonFormInitial | null;
  triggerLabel: string;
  triggerSize?: ComponentProps<typeof Button>["size"];
  triggerVariant?: ComponentProps<typeof Button>["variant"];
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback((): void => {
    setOpen(false);
  }, []);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger
        render={
          <Button size={triggerSize} type="button" variant={triggerVariant} />
        }
      >
        {triggerLabel}
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{initial ? copy.editTitle : copy.createTitle}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-8">
          <AddonForm initial={initial} onSaved={close} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

const copy = messages.addons;
