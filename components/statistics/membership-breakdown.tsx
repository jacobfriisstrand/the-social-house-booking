"use client";

// The invoicing basis split between member and external companies
// (ADR-0014): a donut with the members' share in the middle, and both
// amounts listed under it so the split never relies on colour alone.
import { Label, Pie, PieChart } from "recharts";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { formatOre, formatShare } from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.statistics.membership;

// Literal hex from the palette (DESIGN.md "Colour"): primary and chart-4,
// a pair that stays apart for colour-blind readers.
const config = {
  external: { color: "#964900", label: copy.external },
  member: { color: "#cf975a", label: copy.member },
} satisfies ChartConfig;

const CENTER_LINE_OFFSET = 22;

// Recharts hands the label its viewBox when it renders it.
const coordinate = (value: number | undefined): number => value ?? 0;

function DonutCenter({
  share,
  viewBox,
}: {
  share: string;
  viewBox?: { cx?: number; cy?: number };
}) {
  const cx = coordinate(viewBox?.cx);
  const cy = coordinate(viewBox?.cy);
  return (
    <text dominantBaseline="middle" textAnchor="middle" x={cx} y={cy}>
      <tspan className="fill-foreground font-semibold text-2xl" x={cx} y={cy}>
        {share}
      </tspan>
      <tspan
        className="fill-muted-foreground text-xs"
        x={cx}
        y={cy + CENTER_LINE_OFFSET}
      >
        {copy.memberShare}
      </tspan>
    </text>
  );
}

function LegendRow({
  amountOre,
  kind,
}: {
  amountOre: number;
  kind: keyof typeof config;
}) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-[2px]"
        style={{ backgroundColor: config[kind].color }}
      />
      <span className="text-muted-foreground">{config[kind].label}</span>
      <span className="ml-auto font-medium tabular-nums">
        {formatOre(amountOre)}
      </span>
    </li>
  );
}

export function MembershipBreakdown({
  externalOre,
  memberOre,
}: {
  externalOre: number;
  memberOre: number;
}) {
  const data = [
    { fill: "var(--color-member)", kind: "member", value: memberOre },
    { fill: "var(--color-external)", kind: "external", value: externalOre },
  ];
  const share = formatShare(memberOre / (memberOre + externalOre));

  return (
    <div className="flex flex-1 flex-col justify-between gap-6">
      <ChartContainer className="mx-auto aspect-square h-52" config={config}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="64%"
            isAnimationActive={false}
            nameKey="kind"
            strokeWidth={2}
          >
            <Label content={<DonutCenter share={share} />} />
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="flex flex-col gap-3">
        <LegendRow amountOre={memberOre} kind="member" />
        <LegendRow amountOre={externalOre} kind="external" />
      </ul>
    </div>
  );
}
