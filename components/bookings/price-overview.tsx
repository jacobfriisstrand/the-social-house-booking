// The booking price summary (#6, DESIGN.md "Booking dialog"): a muted
// panel with the room's normal price, the add-ons, the member discount as
// a subtractive line, the manual amounts (ADR-0010) as extra price rows
// and the total excl. VAT — Lokale − rabat + tilkøb + manuelt = samlet.
// The add-ons row carries a small info icon whose hover card lists each
// add-on line with its price; the manual amount's note lives in a
// tooltip. Renders a frozen PriceOverviewModel — pre-confirmation from
// the hold's snapshot columns, post-confirmation from the confirmed row;
// never from live room or company prices (ADR-0005). The discount line
// appears only when the company has a discount, and covers the room
// rental only (ADR-0007). Struck prices belong on room cards, not in
// this panel.
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

// The add-ons row with its info icon: the hover card lists each add-on
// and its price (ADR-0011), the quantity as 12px muted under the name for
// a per-participant add-on. Only rendered when the caller has lines.
function AddOnsRow({ model }: { model: PriceOverviewModel }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="flex items-center text-sm">
        {copy.addOns}
        {model.addOnLines.length > 0 ? (
          <HoverCard>
            <HoverCardTrigger
              closeDelay={100}
              delay={100}
              render={<span className="inline-flex" />}
            >
              <Button
                aria-label={copy.addOnsInfo}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <InfoIcon />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-56">
              <ul className="flex flex-col gap-1.5">
                {model.addOnLines.map((line) => (
                  <li
                    className="flex items-baseline justify-between gap-4"
                    key={line.addonId}
                  >
                    {/* A per-participant add-on's price is unit × headcount,
                        so the count prefixes the name; a fixed one (1) is
                        just the name. */}
                    <span>
                      {line.quantity > 1 ? `${line.quantity}x ` : ""}
                      {line.name}
                    </span>
                    <span className="tabular-nums">
                      {formatOre(line.totalOre)}
                    </span>
                  </li>
                ))}
              </ul>
            </HoverCardContent>
          </HoverCard>
        ) : null}
      </dt>
      <dd className="text-sm tabular-nums">{formatOre(model.addOnsOre)}</dd>
    </div>
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
    <dl className="flex flex-col gap-2 rounded-lg bg-muted">
      <PriceRow label={copy.room} value={formatOre(model.roomNormalTotalOre)} />
      {model.addOnsOre > 0 ? <AddOnsRow model={model} /> : null}
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
