// Lokaler (DESIGN.md "Statistik" 4): every room's held bookings in the
// month, the most booked hours first, with its occupancy as a bar and the
// house's total occupancy in the header.
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { occupancy, type RoomUsage } from "@/lib/domain/statistics-usage";
import {
  formatMonth,
  formatNumber,
  formatOre,
  formatShare,
} from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.statistics.rooms;

const MINUTES_PER_HOUR = 60;
const PERCENT = 100;

const sumOf = (rooms: RoomUsage[], key: "minutes" | "openMinutes"): number =>
  rooms.reduce((total, room) => total + room[key], 0);

function OccupancyCell({ room }: { room: RoomUsage }) {
  const share = occupancy(room.minutes, room.openMinutes) ?? 0;
  return (
    <div className="flex items-center justify-end gap-3">
      <Progress
        aria-label={copy.occupancyLabel(room.name)}
        className="w-20"
        value={share * PERCENT}
      />
      <span className="w-10 tabular-nums">{formatShare(share)}</span>
    </div>
  );
}

function RoomTable({ rooms }: { rooms: RoomUsage[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{copy.columns.room}</TableHead>
          <TableHead className="text-right">{copy.columns.bookings}</TableHead>
          <TableHead className="text-right">{copy.columns.hours}</TableHead>
          <TableHead className="text-right">{copy.columns.occupancy}</TableHead>
          <TableHead className="text-right">{copy.columns.basis}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rooms.map((room) => (
          <TableRow key={room.roomId}>
            <TableCell className="font-medium">{room.name}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(room.bookings)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(room.minutes / MINUTES_PER_HOUR)}
            </TableCell>
            <TableCell>
              <OccupancyCell room={room} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatOre(room.basisOre)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const hasBookings = (rooms: RoomUsage[]): boolean =>
  rooms.some((room) => room.bookings > 0 || room.cancellations > 0);

function TotalOccupancy({ rooms }: { rooms: RoomUsage[] }) {
  const total = occupancy(sumOf(rooms, "minutes"), sumOf(rooms, "openMinutes"));
  if (total === null) {
    return null;
  }
  return (
    <CardAction className="text-muted-foreground text-sm">
      {copy.total(formatShare(total))}
    </CardAction>
  );
}

function RoomTableContent({ rooms }: { rooms: RoomUsage[] }) {
  return (
    <>
      <CardContent>
        <RoomTable rooms={rooms} />
      </CardContent>
      <CardFooter className="border-t text-muted-foreground text-xs">
        {copy.footnote}
      </CardFooter>
    </>
  );
}

function EmptyContent() {
  return (
    <CardContent className="flex flex-1 flex-col">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{copy.emptyTitle}</EmptyTitle>
          <EmptyDescription>{copy.emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </CardContent>
  );
}

export function RoomUsageCard({
  month,
  rooms,
}: {
  month: string;
  rooms: RoomUsage[];
}) {
  const booked = hasBookings(rooms);
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{copy.title}</h2>
        </CardTitle>
        <CardDescription>
          {copy.description(formatMonth(month))}
        </CardDescription>
        {booked ? <TotalOccupancy rooms={rooms} /> : null}
      </CardHeader>
      {booked ? <RoomTableContent rooms={rooms} /> : <EmptyContent />}
    </Card>
  );
}
