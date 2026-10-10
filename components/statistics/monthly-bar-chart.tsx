"use client";

// A year of one Statistik series, one bar per month (DESIGN.md
// "Statistik"). The selected month is drawn at full strength so it lines
// up with the numbers above; months with no data yet have no bar. Hover
// or focus a bar for the month and its value.
import { Bar, BarChart, CartesianGrid, Cell, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  formatMonth,
  formatNumber,
  formatOre,
  formatShortMonth,
} from "@/lib/format";

export interface MonthlyBarPoint {
  month: string;
  value: number | null;
}

// Literal hex from the palette (DESIGN.md "Colour"): bars in primary,
// cancellations in destructive.
const SERIES = {
  basis: { color: "#cf975a", format: formatOre },
  bookings: { color: "#cf975a", format: formatNumber },
  cancellations: { color: "#b60008", format: formatNumber },
} as const;

const OTHER_MONTH_OPACITY = 0.45;

export function MonthlyBarChart({
  label,
  points,
  selectedMonth,
  series,
}: {
  label: string;
  points: MonthlyBarPoint[];
  selectedMonth: string;
  series: keyof typeof SERIES;
}) {
  const { color, format } = SERIES[series];
  const config = { value: { color, label } } satisfies ChartConfig;
  const data = points.map((point) => ({
    ...point,
    label: formatMonth(point.month),
    short: formatShortMonth(point.month),
  }));

  return (
    <ChartContainer className="aspect-auto h-52 w-full" config={config}>
      <BarChart accessibilityLayer data={data} margin={{ top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="short"
          tickLine={false}
          tickMargin={8}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent formatValue={format} labelKey="label" />
          }
        />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          maxBarSize={28}
          radius={[4, 4, 0, 0]}
        >
          {data.map((point) => (
            <Cell
              fillOpacity={
                point.month === selectedMonth ? 1 : OTHER_MONTH_OPACITY
              }
              key={point.month}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
