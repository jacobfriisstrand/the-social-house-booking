"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RoomPreviewDialogProps {
  alt: string;
  images: string[];
  roomName: string;
}

// Click-to-enlarge for the room photo in the admin rooms table: the cell
// always shows the first photo; the dialog shows it enlarged — as a
// carousel when the room has several photos. The carousel region takes
// focus on open (initialFocus), so the arrow keys page it immediately.
export function RoomPreviewDialog({
  alt,
  images,
  roomName,
}: RoomPreviewDialogProps) {
  const single = images.length === 1;
  const carouselRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog>
      <DialogTrigger
        className="block cursor-zoom-in rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        render={<button type="button" />}
      >
        <Image
          alt={alt}
          className="size-10 rounded-lg border object-cover"
          height={40}
          src={images[0]}
          width={40}
        />
      </DialogTrigger>
      <DialogContent
        className="w-fit p-3 sm:max-w-[min(90vw,64rem)]"
        initialFocus={single ? undefined : carouselRef}
      >
        <DialogTitle className="font-normal text-muted-foreground text-xs">
          {roomName}
        </DialogTitle>
        {single ? (
          <Image
            alt={alt}
            className="max-h-[75vh] w-auto rounded-lg object-contain"
            height={1280}
            src={images[0]}
            width={1600}
          />
        ) : (
          <Carousel
            aria-label={roomName}
            className="w-[min(80vw,56rem)]"
            opts={{ loop: true }}
            ref={carouselRef}
            tabIndex={-1}
          >
            <CarouselContent>
              {images.map((src) => (
                <CarouselItem key={src}>
                  <Image
                    alt={alt}
                    className="max-h-[75vh] w-full rounded-lg object-contain"
                    height={1280}
                    src={src}
                    width={1600}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        )}
      </DialogContent>
    </Dialog>
  );
}
