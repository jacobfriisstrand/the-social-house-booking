// One number on Statistik with its change from last month (DESIGN.md
// "Statistik"): the title and a change badge in the header, the number
// (with its unit note, such as "ekskl. moms", beside it), and last
// month's value under it. The badge is left out when last month had
// nothing to compare against.
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { percentChange } from "@/lib/domain/statistics";
import { formatChange } from "@/lib/format";

// A rise is good news for the invoicing basis and bad news for
// cancellations; the badge's tone follows, and its arrow and sign carry
// the direction for anyone who cannot see the colour.
function changeVariant(
  change: number,
  higherIsBetter: boolean
): "destructive" | "outline" | "success" {
  if (change === 0) {
    return "outline";
  }
  return change > 0 === higherIsBetter ? "success" : "destructive";
}

function ChangeBadge({
  change,
  higherIsBetter,
}: {
  change: number;
  higherIsBetter: boolean;
}) {
  const Icon = change < 0 ? TrendingDownIcon : TrendingUpIcon;
  return (
    <Badge variant={changeVariant(change, higherIsBetter)}>
      <Icon data-icon="inline-start" />
      {formatChange(change)}
    </Badge>
  );
}

export function StatCard({
  current,
  higherIsBetter = true,
  previous,
  previousLabel,
  title,
  unit,
  value,
}: {
  current: number;
  higherIsBetter?: boolean;
  previous: number;
  previousLabel: string;
  title: string;
  unit?: string;
  value: string;
}) {
  const change = percentChange(current, previous);
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {change === null ? null : (
          <CardAction>
            <ChangeBadge change={change} higherIsBetter={higherIsBetter} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold text-3xl tabular-nums">{value}</span>
          <span className="text-muted-foreground text-xs">{unit}</span>
        </p>
        <p className="text-muted-foreground text-xs">{previousLabel}</p>
      </CardContent>
    </Card>
  );
}
