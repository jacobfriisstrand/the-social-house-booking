"use client";

// The notice board's rooms (DESIGN.md "Hjem" 3): a framing card with the
// section title, the prev/next ghost buttons top right, and a horizontal
// carousel of room cards. Cards open the room detail page.
import { RoomCard, type RoomCardRoom } from "@/components/rooms/room-card";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
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
    // shrink-0: the panel is a fixed-height scrolling column, and a card
    // that clips its overflow would otherwise shrink to a sliver.
    <Card className="shrink-0">
      <Carousel
        aria-labelledby="room-carousel-title"
        className="flex flex-col gap-4"
        opts={{ align: "start" }}
      >
        <CardHeader className="items-center">
          <h2 className="font-medium text-lg" id="room-carousel-title">
            {copy.roomsTitle}
          </h2>
          <CardAction className="flex gap-2">
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
          </CardAction>
        </CardHeader>
        <CardContent>
          {/* The 1px padding keeps the room cards' outline inside the
              carousel's clipping viewport. */}
          <CarouselContent className="py-px pr-px">
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
        </CardContent>
      </Carousel>
    </Card>
  );
}
