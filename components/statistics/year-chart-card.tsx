// A card with one count month by month for the year (DESIGN.md
// "Statistik"): held bookings or cancellations.
import {
  MonthlyBarChart,
  type MonthlyBarPoint,
} from "@/components/statistics/monthly-bar-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function YearChartCard({
  description,
  month,
  points,
  series,
  title,
}: {
  description: string;
  month: string;
  points: MonthlyBarPoint[];
  series: "bookings" | "cancellations";
  title: string;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <MonthlyBarChart
          label={title}
          points={points}
          selectedMonth={month}
          series={series}
        />
      </CardContent>
    </Card>
  );
}
