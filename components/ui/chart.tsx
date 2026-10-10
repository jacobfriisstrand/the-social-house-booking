"use client";

// shadcn Chart over Recharts, trimmed to what Statistik uses (#10): the
// container that hands each series its colour as a CSS variable
// (--color-<key>), and a tooltip with the hovered point's label and
// values. Light mode only (DESIGN.md), so a series has one colour; the
// upstream <style> injection and theme map are replaced by inline
// variables, and the legend is left out until a chart needs one.
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { createContext, useContext } from "react";
import { ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<string, { color: string; label: ReactNode }>;

const ChartContext = createContext<ChartConfig | null>(null);

function useChart(): ChartConfig {
  const config = useContext(ChartContext);
  if (!config) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return config;
}

const INITIAL_DIMENSION = { height: 200, width: 320 } as const;

const colorVariables = (config: ChartConfig): CSSProperties =>
  Object.fromEntries(
    Object.entries(config).map(([key, item]) => [`--color-${key}`, item.color])
  );

function ChartContainer({
  children,
  className,
  config,
  style,
  ...props
}: ComponentProps<"div"> & {
  children: ComponentProps<typeof ResponsiveContainer>["children"];
  config: ChartConfig;
}) {
  return (
    <ChartContext.Provider value={config}>
      <div
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border [&_.recharts-layer]:outline-hidden [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
          className
        )}
        data-slot="chart"
        style={{ ...colorVariables(config), ...style }}
        {...props}
      >
        <ResponsiveContainer initialDimension={INITIAL_DIMENSION}>
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = Tooltip;

// The slice of a Recharts tooltip entry the content reads; Recharts passes
// the full entry when it clones the content element.
interface ChartTooltipEntry {
  color?: string;
  dataKey?: unknown;
  name?: unknown;
  payload?: Record<string, unknown>;
  value?: unknown;
}

const entryKey = (entry: ChartTooltipEntry): string =>
  String(entry.dataKey ?? entry.name);

const entryValue = (
  entry: ChartTooltipEntry,
  formatValue: (value: number) => string
): string => (typeof entry.value === "number" ? formatValue(entry.value) : "");

function ChartTooltipItem({
  entry,
  formatValue,
}: {
  entry: ChartTooltipEntry;
  formatValue: (value: number) => string;
}) {
  const config = useChart();
  return (
    <div className="flex w-full items-center gap-2">
      <div
        className="size-2.5 shrink-0 rounded-[2px] bg-(--color-bg)"
        style={{ "--color-bg": entry.color } as CSSProperties}
      />
      <div className="flex flex-1 items-center justify-between gap-4 leading-none">
        <span className="text-muted-foreground">
          {config[entryKey(entry)]?.label}
        </span>
        <span className="font-medium text-foreground tabular-nums">
          {entryValue(entry, formatValue)}
        </span>
      </div>
    </div>
  );
}

// labelKey names the field on the hovered data point that titles the
// tooltip (for example a month written out in full).
function ChartTooltipTitle({
  entry,
  labelKey,
}: {
  entry: ChartTooltipEntry;
  labelKey: string;
}) {
  const title = entry.payload?.[labelKey];
  return typeof title === "string" ? (
    <div className="font-medium">{title}</div>
  ) : null;
}

function ChartTooltipContent({
  active,
  className,
  formatValue,
  labelKey,
  payload,
}: {
  active?: boolean;
  className?: string;
  formatValue: (value: number) => string;
  labelKey: string;
  payload?: readonly ChartTooltipEntry[];
}) {
  if (!(active && payload?.length)) {
    return null;
  }
  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      <ChartTooltipTitle entry={payload[0]} labelKey={labelKey} />
      <div className="grid gap-1.5">
        {payload.map((entry) => (
          <ChartTooltipItem
            entry={entry}
            formatValue={formatValue}
            key={entryKey(entry)}
          />
        ))}
      </div>
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };
