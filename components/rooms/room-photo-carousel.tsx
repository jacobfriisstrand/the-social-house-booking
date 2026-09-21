"use client";

// A room's photos as a carousel with two round ghost arrows bottom right
// (DESIGN.md room card). The arrows force their position: the generated
// carousel centres them vertically and its class merge keeps both rules. Used on the room card, and on the room detail
// page below the tablet breakpoint, where the photos are otherwise stacked.
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";

const IMAGE_WIDTH = 640;
const IMAGE_HEIGHT = 400;

interface RoomPhotoCarouselProps {
  className?: string;
  images: string[];
  name: string;
}

export function RoomPhotoCarousel({
  className,
  images,
  name,
}: RoomPhotoCarouselProps) {
  const alt = messages.rooms.imageAlt.replace("{name}", name);
  return (
    <Carousel
      aria-label={name}
      className={cn("overflow-hidden", className)}
      opts={{ loop: true }}
    >
      <CarouselContent className="ml-0">
        {images.map((src) => (
          <CarouselItem className="pl-0" key={src}>
            <Image
              alt={alt}
              className="aspect-video w-full object-cover"
              height={IMAGE_HEIGHT}
              src={src}
              width={IMAGE_WIDTH}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      {images.length > 1 ? (
        <>
          <CarouselPrevious
            className="absolute top-auto! right-12 bottom-2! left-auto my-0! rounded-full bg-card/80"
            size="icon"
            variant="ghost"
          />
          <CarouselNext
            className="absolute top-auto! right-2 bottom-2! my-0! rounded-full bg-card/80"
            size="icon"
            variant="ghost"
          />
        </>
      ) : null}
    </Carousel>
  );
}
