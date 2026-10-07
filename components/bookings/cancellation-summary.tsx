// Platform message 1 (Bilag 2; #11): the booking, the live fee and what
// confirming does. The public cancel page and the booking sheet's confirm
// dialog both render it under the "Vil I afbooke …?" title, with "Behold
// bookingen" and "Bekræft afbooking" as their buttons.
import { DetailRow } from "@/components/bookings/detail-row";
import { formatDate, formatOre, formatTime } from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.cancellation;

export function CancellationSummary({
  bookingNumber,
  endAt,
  feeOre,
  startAt,
}: {
  bookingNumber: string;
  endAt: string;
  feeOre: number;
  startAt: string;
}) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <dl className="flex flex-col">
        <DetailRow label={copy.bookingNumber} value={bookingNumber} />
        <DetailRow label={copy.date} value={formatDate(startAt)} />
        <DetailRow
          label={copy.time}
          value={`${formatTime(startAt)} – ${formatTime(endAt)}`}
        />
      </dl>
      <p>
        {copy.feeIntro}
        <br />
        <strong className="tabular-nums">
          {copy.feeAmount(formatOre(feeOre))}
        </strong>
      </p>
      <p className="text-muted-foreground">{copy.extraCosts}</p>
      <p className="text-muted-foreground">{copy.release}</p>
    </div>
  );
}
