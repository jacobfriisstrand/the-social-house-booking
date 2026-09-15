import { RoomActiveButton } from "@/components/rooms/room-active-button";
import { RoomPreviewDialog } from "@/components/rooms/room-preview-dialog";
import { RoomSheet } from "@/components/rooms/room-sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKroner } from "@/lib/format";
import {
  type AddonOption,
  listAddons,
  listRoomDetails,
  type RoomDetail,
} from "@/lib/rooms/data";
import { createClient } from "@/lib/supabase/server";
import type { RoomFormValues } from "@/lib/validation/rooms";
import { messages } from "@/messages/da";

// Stored `time` values come back as "09:00:00" from Postgres; the form's
// selects work on "HH:mm".
function timeShort(value: string | null | undefined): string | null {
  return value ? value.slice(0, 5) : null;
}

// The stored row for one weekday, or null (a missing row means closed).
function rowForWeekday(
  stored: RoomDetail["openingHours"],
  dayOfWeek: number
): RoomDetail["openingHours"][number] | undefined {
  return stored.find((h) => h.room_opening_hour_day_of_week === dayOfWeek);
}

// One weekday's open/close from its stored row; closed days fall back to
// placeholder times the form ignores (the day renders as closed).
function opensForDay(
  row: RoomDetail["openingHours"][number] | undefined
): string {
  return timeShort(row?.room_opening_hour_opens) ?? "08:00";
}

function closesForDay(
  row: RoomDetail["openingHours"][number] | undefined
): string {
  return timeShort(row?.room_opening_hour_closes) ?? "18:00";
}

// A missing row means the day is closed.
function isClosedForDay(
  row: RoomDetail["openingHours"][number] | undefined
): boolean {
  return row?.room_opening_hour_is_closed ?? true;
}

// Stored weekly rows → the form's full seven-day list; a room without a row
// for a weekday shows that day as closed (a missing row means closed).
function openingHoursForForm(
  stored: RoomDetail["openingHours"]
): RoomFormValues["openingHours"] {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
    const row = rowForWeekday(stored, dayOfWeek);
    return {
      closes: closesForDay(row),
      dayOfWeek,
      isClosed: isClosedForDay(row),
      opens: opensForDay(row),
    };
  });
}

function sheetPropsOf(room: RoomDetail, addons: AddonOption[]) {
  return {
    addons,
    images: room.images.map((image) => ({
      fileName: image.fileName,
      fileSizeBytes: image.fileSizeBytes,
      roomImageId: image.roomImageId,
      url: image.url,
    })),
    initial: {
      addonIds: room.addonIds,
      capacity: room.capacity,
      description: room.description ?? "",
      hourlyPriceOre: room.hourlyPriceOre,
      isActive: room.isActive,
      location: room.location ?? "",
      name: room.name,
      openingHours: openingHoursForForm(room.openingHours),
      practicalNotes: room.practicalNotes ?? "",
      roomId: room.roomId,
    },
    specialDays: room.specialDays.map((day) => ({
      closes: timeShort(day.room_special_closing_day_closes),
      date: day.room_special_closing_day_date,
      isClosed: day.room_special_closing_day_is_closed,
      opens: timeShort(day.room_special_closing_day_opens),
      roomSpecialClosingDayId: day.room_special_closing_day_id,
    })),
  };
}

// The room's first photo as the row thumbnail: the preview dialog when the
// room has images, a muted placeholder otherwise.
function RoomImageCell({ room }: { room: RoomDetail }) {
  const first = room.images[0]?.url;
  return (
    <TableCell className="w-20">
      <div className="flex justify-center">
        {first ? (
          <RoomPreviewDialog
            alt={messages.rooms.imageAlt.replace("{name}", room.name)}
            images={room.images.map((image) => image.url)}
            roomName={room.name}
          />
        ) : (
          <div className="size-10 rounded-lg border bg-muted" />
        )}
      </div>
    </TableCell>
  );
}

// Name with the floor/location line underneath.
function RoomNameCell({ room }: { room: RoomDetail }) {
  return (
    <TableCell className="font-medium">
      {room.name}
      {room.location ? (
        <span className="block text-muted-foreground text-xs">
          {room.location}
        </span>
      ) : null}
    </TableCell>
  );
}

// Status badge: Aktiv when bookable, Deaktiveret when not (history kept).
function RoomStatusCell({ isActive }: { isActive: boolean }) {
  return (
    <TableCell>
      {isActive ? (
        <Badge variant="success">{messages.rooms.activeLabel}</Badge>
      ) : (
        <Badge variant="destructive">{messages.rooms.inactiveLabel}</Badge>
      )}
    </TableCell>
  );
}

// Lokaler (admin): every room with status and price. Edit and create open
// in a sheet on this page (DESIGN.md: admin edit in a dialog or a sheet —
// no dedicated page per entity). Deactivated rooms stay listed with a
// badge — their history is preserved (issue #3). Page title, shell layout,
// and the muted panel come from the app shell (#55); this page renders
// content only.
export default async function AdminRoomsPage() {
  const supabase = await createClient();
  const [rooms, addons] = await Promise.all([
    listRoomDetails(supabase),
    listAddons(supabase),
  ]);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex justify-end">
        <RoomSheet
          addons={addons}
          images={[]}
          initial={null}
          specialDays={[]}
          triggerLabel={messages.rooms.createButton}
          triggerSize="default"
          triggerVariant="default"
        />
      </div>

      {rooms.length === 0 ? (
        <Card className="py-16">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-medium text-lg">{messages.rooms.emptyTitle}</h2>
            <p className="text-muted-foreground text-sm">
              {messages.rooms.emptyDescription}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16" />
                <TableHead>{messages.rooms.nameColumn}</TableHead>
                <TableHead>{messages.rooms.capacityColumn}</TableHead>
                <TableHead>{messages.rooms.priceColumn}</TableHead>
                <TableHead>{messages.rooms.activeColumn}</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.roomId}>
                  <RoomImageCell room={room} />
                  <RoomNameCell room={room} />
                  <TableCell className="tabular-nums">
                    {room.capacity} {messages.rooms.persons}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatKroner(room.hourlyPriceOre)}
                    {messages.rooms.perHourSuffix}
                  </TableCell>
                  <RoomStatusCell isActive={room.isActive} />
                  <TableCell>
                    <div className="flex items-center justify-end gap-2 *:basis-1/2">
                      <RoomSheet
                        {...sheetPropsOf(room, addons)}
                        triggerLabel={messages.rooms.editLabel}
                      />
                      <RoomActiveButton
                        isActive={room.isActive}
                        roomId={room.roomId}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </main>
  );
}
