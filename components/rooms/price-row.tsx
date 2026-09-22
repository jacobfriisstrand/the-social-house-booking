import { formatKroner } from "@/lib/format";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";

interface PriceRowProps {
  className?: string;
  // null: the viewer has no company (admin), so only the normal price shows.
  discountPercent: number | null;
  hourlyPriceOre: number;
}

const perHour = (ore: number): string =>
  `${formatKroner(ore)}${messages.rooms.perHourSuffix}`;

const hasDiscount = (
  discountPercent: number | null
): discountPercent is number => discountPercent !== null && discountPercent > 0;

const memberHourly = (
  hourlyPriceOre: number,
  discountPercent: number
): number => Math.round((hourlyPriceOre * (100 - discountPercent)) / 100);

function NormalPrice({ hourlyPriceOre }: { hourlyPriceOre: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground text-xs">
        {messages.rooms.normalPrice}
      </span>
      <span className="text-muted-foreground text-sm line-through">
        {perHour(hourlyPriceOre)}
      </span>
    </div>
  );
}

// "Normalpris" struck left, "Din pris" right (DESIGN.md room card). Without
// a discount the struck price is omitted and the price sits alone.
export function PriceRow({
  className,
  discountPercent,
  hourlyPriceOre,
}: PriceRowProps) {
  const discounted = hasDiscount(discountPercent);
  const label =
    discountPercent === null
      ? messages.rooms.normalPrice
      : messages.rooms.yourPrice;
  const shown = discounted
    ? memberHourly(hourlyPriceOre, discountPercent)
    : hourlyPriceOre;
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      {discounted ? <NormalPrice hourlyPriceOre={hourlyPriceOre} /> : null}
      <div className="flex flex-col text-right">
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className="font-medium text-lg">{perHour(shown)}</span>
      </div>
    </div>
  );
}
