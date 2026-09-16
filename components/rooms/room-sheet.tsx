"use client";

import { useRouter } from "next/navigation";
import { type ComponentProps, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { deleteRoomImage, reorderRoomImages } from "@/lib/rooms/actions";
import type { AddonOption } from "@/lib/rooms/data";
import { messages } from "@/messages/da";
import {
  RoomForm,
  type RoomFormInitial,
  type RoomFormProps,
} from "./room-form";
import {
  type SpecialClosingDayItem,
  SpecialClosingDays,
} from "./special-closing-days";

interface RoomSheetProps {
  addons: AddonOption[];
  images: Array<{
    fileName: string;
    fileSizeBytes: number;
    roomImageId: string;
    url: string;
  }>;
  // Room in edit mode; null in create mode.
  initial: RoomFormInitial | null;
  specialDays: SpecialClosingDayItem[];
  triggerLabel: string;
  triggerSize?: ComponentProps<typeof Button>["size"];
  triggerVariant?: ComponentProps<typeof Button>["variant"];
}

interface RoomSheetBodyProps {
  addons: AddonOption[];
  close: () => void;
  images: RoomSheetProps["images"];
  initial: RoomFormInitial | null;
  removeImage: (roomImageId: string) => Promise<void>;
  reorderImages: (
    roomId: string,
    orderedRoomImageIds: string[]
  ) => Promise<boolean>;
  specialDays: SpecialClosingDayItem[];
}

// Edit-only form props, present only when a room exists.
function editOnlyProps(
  initial: RoomFormInitial | null,
  images: RoomSheetProps["images"],
  removeImage: RoomSheetBodyProps["removeImage"],
  reorderImages: RoomSheetBodyProps["reorderImages"]
): Pick<RoomFormProps, "onRemoveImage" | "onReorderImages" | "savedImages"> {
  if (!initial) {
    return {
      onRemoveImage: undefined,
      onReorderImages: undefined,
      savedImages: undefined,
    };
  }
  return {
    onRemoveImage: removeImage,
    onReorderImages: (orderedRoomImageIds: string[]) =>
      reorderImages(initial.roomId, orderedRoomImageIds),
    savedImages: images,
  };
}

// The sheet's body: the form plus, in edit mode, the special closing days
// card. Edit-only props pass through only when a room exists.
function RoomSheetBody({
  addons,
  close,
  images,
  initial,
  removeImage,
  reorderImages,
  specialDays,
}: RoomSheetBodyProps) {
  return (
    <div className="flex flex-col gap-6 px-4 pb-8">
      <RoomForm
        {...editOnlyProps(initial, images, removeImage, reorderImages)}
        addons={addons}
        initial={initial}
        onSaved={close}
      />
      {initial ? (
        <SpecialClosingDays roomId={initial.roomId} specialDays={specialDays} />
      ) : null}
    </div>
  );
}

// The room form in a right-hand sheet (DESIGN.md: admin edit in a dialog or
// a sheet). The sheet opens in place on the page that renders its trigger —
// no navigation, no dedicated page. The general edit pattern for admin
// entities (rooms, add-ons, …). Content mounts only while open.
export function RoomSheet({
  addons,
  specialDays,
  images,
  initial,
  triggerLabel,
  triggerSize = "sm",
  triggerVariant = "outline",
}: RoomSheetProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const close = useCallback((): void => {
    setOpen(false);
  }, []);

  const removeImage = useCallback(
    async (roomImageId: string): Promise<void> => {
      const result = await deleteRoomImage(roomImageId);
      if (result.status === "success") {
        toast.add({ title: messages.rooms.imageDeleted, type: "success" });
        router.refresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    },
    [router]
  );

  const reorderImages = useCallback(
    async (roomId: string, orderedRoomImageIds: string[]): Promise<boolean> => {
      const result = await reorderRoomImages(roomId, orderedRoomImageIds);
      if (result.status === "success") {
        router.refresh();
        return true;
      }
      toast.add({ title: result.error, type: "error" });
      return false;
    },
    [router]
  );

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger
        render={
          <Button size={triggerSize} type="button" variant={triggerVariant} />
        }
      >
        {triggerLabel}
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {initial ? messages.rooms.editTitle : messages.rooms.createTitle}
          </SheetTitle>
        </SheetHeader>
        <RoomSheetBody
          addons={addons}
          close={close}
          images={images}
          initial={initial}
          removeImage={removeImage}
          reorderImages={reorderImages}
          specialDays={specialDays}
        />
      </SheetContent>
    </Sheet>
  );
}
