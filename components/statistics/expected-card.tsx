// Forventet (ADR-0014): the month's bookings whose meeting is not over
// yet, as expected value. Never part of the invoicing basis.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MonthStatistics } from "@/lib/domain/statistics";
import { formatOre } from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.statistics.expected;

export function ExpectedCard({ stats }: { stats: MonthStatistics }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{copy.title}</h2>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="font-semibold text-3xl tabular-nums">
          {formatOre(stats.expectedOre)}
        </p>
        <p className="text-muted-foreground text-xs">
          {copy.bookings(stats.expectedBookings)}, {messages.format.exclVat}
        </p>
      </CardContent>
    </Card>
  );
}
