import { formatOre } from "@/lib/format";
import { messages } from "@/messages/da";

export interface PriceLines {
  addonsOre: number;
  discountOre: number;
  discountPercent: number;
  roomOre: number;
  subtotalOre: number;
  totalOre: number;
}

const copy = messages.booking.dialog;

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

// The muted price panel (DESIGN.md booking dialog): room, add-ons,
// subtotal, the discount line in success, total bold with "ekskl. moms".
export function PriceSummary({ lines }: { lines: PriceLines }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted p-4">
      <Line label={copy.priceRoom} value={formatOre(lines.roomOre)} />
      <Line label={copy.priceAddons} value={formatOre(lines.addonsOre)} />
      <Line label={copy.priceSubtotal} value={formatOre(lines.subtotalOre)} />
      {lines.discountPercent > 0 ? (
        <div className="flex justify-between text-sm text-success">
          <span>{copy.priceDiscount(lines.discountPercent)}</span>
          <span className="tabular-nums">-{formatOre(lines.discountOre)}</span>
        </div>
      ) : null}
      <div className="mt-2 flex items-baseline justify-between border-t pt-2">
        <span className="font-semibold text-xl">{copy.priceTotal}</span>
        <span className="flex items-baseline gap-2">
          <span className="font-semibold text-xl tabular-nums">
            {formatOre(lines.totalOre)}
          </span>
          <span className="text-muted-foreground text-xs">
            {messages.format.exclVat}
          </span>
        </span>
      </div>
    </div>
  );
}
