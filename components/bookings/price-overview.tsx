// The booking price summary (#6, DESIGN.md "Booking dialog"): a muted
// panel with the room's normal price, the add-ons, the member discount as
// a subtractive line, the manual amounts (ADR-0010) as extra price rows
// and the total excl. VAT — Lokale − rabat + tilkøb + manuelt = samlet.
// The add-ons summary carries the breakdown right below it, one row per
// add-on with its price (ADR-0011); the manual amount's note lives in a
// tooltip. Renders a frozen PriceOverviewModel — pre-confirmation from
// the hold's snapshot columns, post-confirmation from the confirmed row;
// never from live room or company prices (ADR-0005). The discount line
// always renders right beneath the room price — the discount covers the
// room rental only (ADR-0007), 0,00 included. Struck prices belong on
// room cards, not in this panel.
import { InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

// The add-ons block: the summary row, then each add-on's breakdown right
// below it — name and line total (ADR-0011), the quantity as a 3x prefix
// for a per-participant add-on and a muted 12px row so the lines read as
// detail under the sum. An add-on that is no longer active carries no
// name; the inactive label stands in. Each line with a description
// carries an info hover button for it. Rendered when the caller has a
// sum or lines — several callers pass the sum only.
function AddOnsBlock({ model }: { model: PriceOverviewModel }) {
  return (
    <>
      <PriceRow label={copy.addOns} value={formatOre(model.addOnsOre)} />
      {model.addOnLines.map((line) => (
        <div
          className="flex items-baseline justify-between gap-4 pl-4"
          key={line.addonId}
        >
          {/* A per-participant add-on's price is unit × headcount, so the
              count prefixes the name; a fixed one (1) is just the name. The
              info hover shows the catalogue description when the add-on has
              one — the manual amount row's own pattern. */}
          <dt className="flex items-center gap-1 text-muted-foreground text-xs">
            {line.name === null
              ? messages.bookings.inactiveAddOn
              : `${line.quantity > 1 ? `${line.quantity}x ` : ""}${line.name}`}
            {line.description ? (
              <HoverCard>
                <HoverCardTrigger
                  closeDelay={100}
                  delay={100}
                  render={<span className="inline-flex" />}
                >
                  <Button
                    aria-label={copy.addOnInfo}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    <InfoIcon />
                  </Button>
                </HoverCardTrigger>
                {/* Descriptions are admin-written and may carry line
                    breaks; pre-line keeps them in the hover card. */}
                <HoverCardContent className="w-72">
                  <p className="whitespace-pre-line text-sm">
                    {line.description}
                  </p>
                </HoverCardContent>
              </HoverCard>
            ) : null}
          </dt>
          <dd className="text-muted-foreground text-xs tabular-nums">
            {formatOre(line.totalOre)}
          </dd>
        </div>
      ))}
    </>
  );
}

// One manual amount (ADR-0010) as an extra price row: "Manuelt beløb"
// with a small info icon whose tooltip carries the note — the company
// needs only what the amount was for, not when it was added.
function ManualAmountRow({
  amount,
}: {
  amount: PriceOverviewModel["manualAmounts"][number];
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="flex items-center text-sm">
        {copy.manualAmount}
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button
              aria-label={copy.manualAmountInfo}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <InfoIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{amount.note}</TooltipContent>
        </Tooltip>
      </dt>
      <dd className="text-sm tabular-nums">{formatOre(amount.amountOre)}</dd>
    </div>
  );
}

export function PriceOverview({ model }: { model: PriceOverviewModel }) {
  return (
    <dl className="flex flex-col gap-2 rounded-lg bg-muted p-4">
      <PriceRow label={copy.room} value={formatOre(model.roomNormalTotalOre)} />
      {/* The discount covers the room rental only (ADR-0007), so it reads
          right beneath the room price — always, 0,00 included, so the
          arithmetic is visible whatever the company's rate is. */}
      <div className="flex items-baseline justify-between gap-4 text-success">
        <dt className="text-sm">
          {copy.memberDiscount(model.discountPercent)}
        </dt>
        <dd className="text-sm tabular-nums">{formatOre(-model.savingsOre)}</dd>
      </div>
      {model.addOnsOre > 0 || model.addOnLines.length > 0 ? (
        <AddOnsBlock model={model} />
      ) : null}
      {model.manualAmounts.map((amount) => (
        <ManualAmountRow amount={amount} key={amount.manualAmountId} />
      ))}
      <div className="mt-2 flex items-baseline justify-between gap-4 border-border border-t pt-3">
        <dt className="font-medium text-xl">{copy.total}</dt>
        <dd className="flex flex-col items-end">
          <span className="font-medium text-xl tabular-nums">
            {formatOre(model.totalOre)}
          </span>
          <span className="text-muted-foreground text-xs">{copy.exclVat}</span>
        </dd>
      </div>
    </dl>
  );
}
