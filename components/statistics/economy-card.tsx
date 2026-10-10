// Bookingøkonomi (DESIGN.md "Statistik"): the invoicing basis month by
// month for the year, and the selected month's basis in its four parts,
// each with its share of the whole.
import {
  CalendarXIcon,
  DoorOpenIcon,
  type LucideIcon,
  ReceiptTextIcon,
  ShoppingBagIcon,
} from "lucide-react";
import { MonthlyBarChart } from "@/components/statistics/monthly-bar-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { MonthStatistics, YearPoint } from "@/lib/domain/statistics";
import { formatOre } from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.statistics;

const PERCENT = 100;

function BasisPart({
  basisOre,
  icon: Icon,
  label,
  valueOre,
}: {
  basisOre: number;
  icon: LucideIcon;
  label: string;
  valueOre: number;
}) {
  const share = basisOre === 0 ? 0 : (valueOre / basisOre) * PERCENT;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <span className="text-sm">{label}</span>
        <span className="ml-auto font-medium text-sm tabular-nums">
          {formatOre(valueOre)}
        </span>
      </div>
      <Progress aria-label={label} value={share} />
    </div>
  );
}

export function EconomyCard({
  className,
  month,
  stats,
  year,
}: {
  className?: string;
  month: string;
  stats: MonthStatistics;
  year: YearPoint[];
}) {
  const parts = [
    {
      icon: DoorOpenIcon,
      label: copy.economy.roomRent,
      valueOre: stats.roomRentOre,
    },
    {
      icon: ShoppingBagIcon,
      label: copy.economy.addons,
      valueOre: stats.addonsOre,
    },
    {
      icon: CalendarXIcon,
      label: copy.economy.cancellationFees,
      valueOre: stats.cancellationFeesOre,
    },
    {
      icon: ReceiptTextIcon,
      label: copy.economy.manualAmounts,
      valueOre: stats.manualAmountsOre,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{copy.economy.title}</h2>
        </CardTitle>
        <CardDescription>
          {copy.economy.description(month.slice(0, 4))}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MonthlyBarChart
          label={copy.kpi.basis}
          points={year.map((point) => ({
            month: point.month,
            value: point.basisOre,
          }))}
          selectedMonth={month}
          series="basis"
        />
      </CardContent>
      <Separator />
      <CardContent className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {parts.map((part) => (
          <BasisPart
            basisOre={stats.basisOre}
            icon={part.icon}
            key={part.label}
            label={part.label}
            valueOre={part.valueOre}
          />
        ))}
      </CardContent>
      <CardFooter className="text-muted-foreground text-xs">
        {copy.economy.footnote}
      </CardFooter>
    </Card>
  );
}
