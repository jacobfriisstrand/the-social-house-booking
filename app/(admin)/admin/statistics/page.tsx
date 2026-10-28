import type { Metadata } from "next";
import { z } from "zod";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { CompanyUsageCard } from "@/components/statistics/company-usage-card";
import { EconomyCard } from "@/components/statistics/economy-card";
import { ExpectedCard } from "@/components/statistics/expected-card";
import { MembershipCard } from "@/components/statistics/membership-card";
import { MonthControl } from "@/components/statistics/month-control";
import { RoomUsageCard } from "@/components/statistics/room-usage-card";
import { StatCard } from "@/components/statistics/stat-card";
import { YearChartCard } from "@/components/statistics/year-chart-card";
import {
  type MonthStatistics,
  monthOf,
  shiftMonth,
  statisticsOverview,
} from "@/lib/domain/statistics";
import { companyUsage, roomUsage } from "@/lib/domain/statistics-usage";
import { formatMonth, formatNumber, formatOre } from "@/lib/format";
import {
  listStatisticsBookings,
  listStatisticsRooms,
} from "@/lib/statistics/data";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

const copy = messages.statistics;

export const metadata: Metadata = {
  title: messages.shell.statistics,
};

type SearchParams = Promise<{ month?: string }>;

// The month to show: ?month=yyyy-mm, or this month in Copenhagen.
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const monthParam = z.string().regex(MONTH_PATTERN);

const MINUTES_PER_HOUR = 60;

const roomHours = (stats: MonthStatistics): string =>
  formatNumber(stats.roomMinutes / MINUTES_PER_HOUR);

// Statistik (#10, ADR-0014, DESIGN.md "Statistik"): the monthly booking
// economy across every company. Four numbers against last month, the
// invoicing basis month by month and in parts, the member/external split,
// the year's bookings and cancellations, and what the rest of the month is
// expected to bring, and who used the house: every room's bookings and
// occupancy, and the companies that booked the most. The layout guards the route (app_role = 'admin');
// group/statistics lets the month control dim the figures while the next
// month loads.
export default async function AdminStatisticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { month: monthParamRaw } = await searchParams;
  const now = new Date();
  const month = monthParam.safeParse(monthParamRaw).data ?? monthOf(now);
  const supabase = await createClient();
  const [bookings, rooms] = await Promise.all([
    listStatisticsBookings(supabase, month),
    listStatisticsRooms(supabase),
  ]);
  const { current, previous, year } = statisticsOverview(bookings, month, now);
  const lastMonth = formatMonth(shiftMonth(month, -1));
  const yearLabel = month.slice(0, 4);

  return (
    <div className="group/statistics contents">
      <PageHeader title={messages.shell.statistics} />
      <PagePanel actions={<MonthControl month={month} />}>
        <div className="flex flex-col gap-6 transition-opacity group-has-data-pending/statistics:opacity-50">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              current={current.basisOre}
              previous={previous.basisOre}
              previousLabel={copy.previousValue(
                lastMonth,
                formatOre(previous.basisOre)
              )}
              title={copy.kpi.basis}
              unit={messages.format.exclVat}
              value={formatOre(current.basisOre)}
            />
            <StatCard
              current={current.bookings}
              previous={previous.bookings}
              previousLabel={copy.previousValue(
                lastMonth,
                formatNumber(previous.bookings)
              )}
              title={copy.kpi.bookings}
              value={formatNumber(current.bookings)}
            />
            <StatCard
              current={current.roomMinutes}
              previous={previous.roomMinutes}
              previousLabel={copy.previousValue(lastMonth, roomHours(previous))}
              title={copy.kpi.roomHours}
              value={roomHours(current)}
            />
            <StatCard
              current={current.cancellations}
              higherIsBetter={false}
              previous={previous.cancellations}
              previousLabel={copy.previousValue(
                lastMonth,
                formatNumber(previous.cancellations)
              )}
              title={copy.kpi.cancellations}
              value={formatNumber(current.cancellations)}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <EconomyCard
              className="lg:col-span-2"
              month={month}
              stats={current}
              year={year}
            />
            <MembershipCard month={month} stats={current} />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <YearChartCard
              description={copy.held.description(yearLabel)}
              month={month}
              points={year.map((point) => ({
                month: point.month,
                value: point.bookings,
              }))}
              series="bookings"
              title={copy.held.title}
            />
            <YearChartCard
              description={copy.cancellations.description(yearLabel)}
              month={month}
              points={year.map((point) => ({
                month: point.month,
                value: point.cancellations,
              }))}
              series="cancellations"
              title={copy.cancellations.title}
            />
            <ExpectedCard stats={current} />
          </div>
          <RoomUsageCard
            month={month}
            rooms={roomUsage(bookings, rooms, month, now)}
          />
          <CompanyUsageCard
            basisOre={current.basisOre}
            companies={companyUsage(bookings, month, now)}
            month={month}
          />
        </div>
      </PagePanel>
    </div>
  );
}
