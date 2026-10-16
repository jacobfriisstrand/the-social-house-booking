// Virksomheder (DESIGN.md "Statistik" 4): the companies that held the most
// bookings in the month, each with its membership and its share of the
// month's invoicing basis.
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CompanyUsage } from "@/lib/domain/statistics-usage";
import {
  formatMonth,
  formatNumber,
  formatOre,
  formatShare,
} from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.statistics.companies;
const membershipLabel = messages.companies.membership;

const MINUTES_PER_HOUR = 60;
const TOP_COMPANIES = 10;

function CompanyTable({
  basisOre,
  companies,
}: {
  basisOre: number;
  companies: CompanyUsage[];
}) {
  return (
    <Table sticky>
      <TableHeader>
        <TableRow>
          <TableHead>{copy.columns.company}</TableHead>
          <TableHead className="text-right">{copy.columns.bookings}</TableHead>
          <TableHead className="text-right">{copy.columns.hours}</TableHead>
          <TableHead className="text-right">
            {copy.columns.cancellations}
          </TableHead>
          <TableHead className="text-right">{copy.columns.basis}</TableHead>
          <TableHead className="text-right">{copy.columns.share}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((company) => (
          <TableRow key={company.companyId}>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="font-medium">{company.name}</span>
                <Badge variant="outline">
                  {membershipLabel[company.membership]}
                </Badge>
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(company.bookings)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(company.minutes / MINUTES_PER_HOUR)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(company.cancellations)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatOre(company.basisOre)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatShare(basisOre === 0 ? 0 : company.basisOre / basisOre)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CompanyUsageCard({
  basisOre,
  companies,
  month,
}: {
  basisOre: number;
  companies: CompanyUsage[];
  month: string;
}) {
  const shown = companies.slice(0, TOP_COMPANIES);
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{copy.title}</h2>
        </CardTitle>
        <CardDescription>
          {copy.description(formatMonth(month), shown.length, companies.length)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {shown.length > 0 ? (
          <CompanyTable basisOre={basisOre} companies={shown} />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{copy.emptyTitle}</EmptyTitle>
              <EmptyDescription>{copy.emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
