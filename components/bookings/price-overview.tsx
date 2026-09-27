// The booking price summary (#6, DESIGN.md "Booking dialog"): a muted
// panel with the room's normal price, the add-ons, the member discount as
// a subtractive line and the total excl. VAT — Lokale − rabat + tilkøb =
// samlet. Renders a frozen PriceOverviewModel — pre-confirmation from the
// hold's snapshot columns, post-confirmation from the confirmed row; never
// from live room or company prices (ADR-0005). The discount line appears
// only when the company has a discount, and covers the room rental only
// (ADR-0007). Struck prices belong on room cards, not in this panel.
import type { PriceOverviewModel } from "@/lib/domain/price-overview";
import { formatOre } from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.booking.price;

function PriceRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm">{label}</dt>
      <dd className="text-sm tabular-nums">{value}</dd>
    </div>
  );
}

export function PriceOverview({ model }: { model: PriceOverviewModel }) {
  return (
    <dl className="flex flex-col gap-2 rounded-lg bg-muted p-4">
      <PriceRow label={copy.room} value={formatOre(model.roomNormalTotalOre)} />
      {model.addOnsOre > 0 ? (
        <PriceRow label={copy.addOns} value={formatOre(model.addOnsOre)} />
      ) : null}
      {model.showSavings ? (
        <div className="flex items-baseline justify-between gap-4 text-success">
          <dt className="text-sm">
            {copy.memberDiscount(model.discountPercent)}
          </dt>
          <dd className="text-sm tabular-nums">
            {formatOre(-model.savingsOre)}
          </dd>
        </div>
      ) : null}
      <div className="mt-2 flex items-baseline justify-between gap-4 border-border border-t pt-3">
        <dt className="font-medium text-xl">{copy.total}</dt>
        <dd className="flex items-baseline gap-2">
          <span className="font-medium text-xl tabular-nums">
            {formatOre(model.totalOre)}
          </span>
          <span className="text-muted-foreground text-xs">{copy.exclVat}</span>
        </dd>
      </div>
    </dl>
  );
}
