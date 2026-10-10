// Medlemmer og eksterne (ADR-0014): the month's invoicing basis split by
// the companies' membership status, or an empty state while the month has
// no basis to split.
import { MembershipBreakdown } from "@/components/statistics/membership-breakdown";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import type { MonthStatistics } from "@/lib/domain/statistics";
import { formatMonth } from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.statistics.membership;

export function MembershipCard({
  month,
  stats,
}: {
  month: string;
  stats: MonthStatistics;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{copy.title}</h2>
        </CardTitle>
        <CardDescription>
          {copy.description(formatMonth(month))}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {stats.basisOre === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{copy.emptyTitle}</EmptyTitle>
              <EmptyDescription>{copy.emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <MembershipBreakdown
            externalOre={stats.externalBasisOre}
            memberOre={stats.memberBasisOre}
          />
        )}
      </CardContent>
    </Card>
  );
}
