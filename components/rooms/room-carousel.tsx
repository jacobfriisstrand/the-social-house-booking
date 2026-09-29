"use client";

// The notice board's rooms (DESIGN.md "Hjem" 3): a horizontal carousel of
// room cards with the prev/next ghost buttons top right, next to the
// section title. Cards open the room detail page.
import { RoomCard, type RoomCardRoom } from "@/components/rooms/room-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { messages } from "@/messages/da";

const copy = messages.home;

export function RoomCarousel({
  discountPercent,
  rooms,
}: {
  discountPercent: number | null;
  rooms: RoomCardRoom[];
}) {
  if (rooms.length === 0) {
    return null;
  }
  return (
    <Carousel
      aria-labelledby="room-carousel-title"
      className="flex flex-col gap-3"
      opts={{ align: "start" }}
    >
      <div className="flex min-h-9 items-center justify-between gap-4">
        <h2 className="font-medium text-lg" id="room-carousel-title">
          {copy.roomsTitle}
        </h2>
        <div className="flex gap-2">
          <CarouselPrevious
            aria-label={copy.previousRooms}
            className="static my-0"
            size="icon"
            variant="ghost"
          />
          <CarouselNext
            aria-label={copy.nextRooms}
            className="static my-0"
            size="icon"
            variant="ghost"
          />
        </div>
      </div>
      <CarouselContent>
        {rooms.map((room) => (
          <CarouselItem
            className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
            key={room.roomId}
          >
            <RoomCard
              discountPercent={discountPercent}
              href={`/rooms/${room.roomId}`}
              room={room}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
