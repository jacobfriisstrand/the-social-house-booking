"use client";

import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
// Bookinger (admin), the shell around the two views (#9, DESIGN.md
// "Bookinger (admin)"): the filter row, the view toggle and the list or
// the calendar. Every control writes its change to the URL, so the two
// views share one state and a switch keeps the filters; the server re-reads
// the set. The list's sorting, selection and bulk mark live with the table
// (admin-bookings-table.tsx); the calendar's month grid is
// admin-calendar-grid.tsx.
import type * as React from "react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { AdminCalendarCell } from "@/lib/bookings/admin-calendar";
import type { AdminFilterOptions } from "@/lib/bookings/admin-data";
import {
  type AdminViewParams,
  adminViewHref,
  movedPeriod,
  windowAround,
} from "@/lib/bookings/admin-view-params";
import type { AdminOverviewRow } from "@/lib/domain/admin-bookings";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";
import { AdminBookingsTable } from "./admin-bookings-table";
import { AdminCalendarGrid } from "./admin-calendar-grid";

const copy = messages.bookings.admin;

/** What the server built for the calendar: the month's compact cells. */
export interface AdminCalendarModel {
  cells: AdminCalendarCell[];
}

const monthName = (date: string): string => {
  const [year, month] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("da-DK", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
};

// A filter's multi-select: every option carries a checkbox, so the
// selection reads at a glance; no selection means the filter is off and
// the trigger says so ("Alle virksomheder"). Toggling writes the URL at
// once — the server re-reads the set — and the popup stays open, so the
// admin can tick several. The x beside the trigger clears the filter.
function FilterMultiSelect({
  allLabel,
  label,
  onChange,
  options,
  value,
}: {
  allLabel: string;
  label: string;
  onChange: (ids: string[]) => void;
  options: Array<{ label: string; value: string }>;
  value: string[];
}) {
  let summary = allLabel;
  if (value.length === 1) {
    summary =
      options.find((option) => option.value === value[0])?.label ?? allLabel;
  } else if (value.length > 1) {
    summary = copy.selection.selected(value.length);
  }
  const clear = useCallback(() => onChange([]), [onChange]);
  // The x sits inside the trigger, beside the chevron. Base UI toggles the
  // popup in the trigger's own click handler, so the click stops here. The
  // span is not focusable — no second focus stop inside a button — so
  // keyboard users clear by unticking (ponytail: clear-on-Escape inside
  // the open popup would close that gap).
  const onClearClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      clear();
    },
    [clear]
  );
  return (
    <Select multiple onValueChange={onChange} value={value}>
      <SelectTrigger aria-label={label} className="w-44" size="sm">
        <span
          className={cn(
            "truncate",
            value.length === 0 && "text-muted-foreground"
          )}
        >
          {summary}
        </span>
        {value.length > 0 ? (
          <span
            aria-hidden="true"
            className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={onClearClick}
          >
            <XIcon className="size-3.5" />
          </span>
        ) : null}
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => {
            const selected = value.includes(option.value);
            return (
              // The list's own check at the right is redundant next to
              // the checkbox and is switched off for these items.
              <SelectItem
                className="[&_[data-slot=select-item-indicator]]:hidden"
                key={option.value}
                value={option.value}
              >
                <span
                  aria-hidden="true"
                  className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-secondary data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground"
                  data-checked={selected || undefined}
                >
                  {selected ? <CheckIcon className="size-3" /> : null}
                </span>
                {option.label}
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function PeriodControl({
  params,
  today,
}: {
  params: AdminViewParams;
  today: string;
}) {
  const router = useRouter();

  const move = useCallback(
    (steps: number) => {
      router.push(adminViewHref(params, movedPeriod(params, steps)));
    },
    [params, router]
  );

  const goToday = useCallback(() => {
    router.push(adminViewHref(params, windowAround(today)));
  }, [params, router, today]);

  const moveBack = useCallback(() => move(-1), [move]);
  const moveForward = useCallback(() => move(1), [move]);

  return (
    <div className="flex items-center gap-2">
      {/* The group stays empty on purpose: forrige / I dag / næste are
          momentary actions, never a selection that latches. */}
      <ToggleGroup spacing={0} value={[]} variant="outline">
        <ToggleGroupItem
          aria-label={copy.filters.previous}
          onClick={moveBack}
          value="previous"
        >
          <ChevronLeftIcon aria-hidden="true" />
        </ToggleGroupItem>
        <ToggleGroupItem onClick={goToday} value="today">
          {copy.filters.today}
        </ToggleGroupItem>
        <ToggleGroupItem
          aria-label={copy.filters.next}
          onClick={moveForward}
          value="next"
        >
          <ChevronRightIcon aria-hidden="true" />
        </ToggleGroupItem>
      </ToggleGroup>
      <span className="font-medium text-sm">{monthName(params.fromDate)}</span>
    </div>
  );
}

export function AdminBookingsView({
  calendar,
  options,
  params,
  rows,
  today,
}: {
  // Null in the list view; a day grid or a compact grid otherwise.
  calendar: AdminCalendarModel | null;
  options: AdminFilterOptions;
  params: AdminViewParams;
  rows: AdminOverviewRow[];
  today: string;
}) {
  const router = useRouter();

  // Every control writes its change to the URL at once, but the fresh
  // params land one server read later. A second control touched in that
  // window must not build its URL from the stale props and drop the first
  // change — the overlay carries what was pushed since the last read, and
  // the fresh props clear it. Every control below reads `view`, the
  // merged params, not the raw props.
  const paramsKey = adminViewHref(params);
  const [pending, setPending] = useState<Partial<AdminViewParams>>({});
  const [paramsRead, setParamsRead] = useState(paramsKey);
  if (paramsKey !== paramsRead) {
    // Fresh server params: they carry what the pushes asked for.
    setParamsRead(paramsKey);
    setPending({});
  }
  const view: AdminViewParams = { ...params, ...pending };

  const update = useCallback(
    (changes: Partial<AdminViewParams>) => {
      // The merged overlay stands in until the props catch up, so a rapid
      // second control (or a second tick on the same one) accumulates
      // instead of clobbering.
      const merged = { ...pending, ...changes };
      setPending(merged);
      router.push(adminViewHref({ ...params, ...merged }));
    },
    [params, pending, router]
  );

  const resetFilters = useCallback(() => {
    setPending({});
    router.push(
      adminViewHref({
        ...params,
        companyIds: [],
        includeHouseEvents: true,
        invoicingStatuses: [],
        memberships: [],
        roomIds: [],
        ...windowAround(today),
      })
    );
  }, [params, router, today]);

  const companyOptions = options.companies.map((company) => ({
    label: company.displayName,
    value: company.companyId,
  }));
  const roomOptions = options.rooms.map((room) => ({
    label: room.roomName,
    value: room.roomId,
  }));
  const statusOptions = [
    {
      label: messages.bookings.invoicing.notInvoiced,
      value: "not_invoiced",
    },
    { label: messages.bookings.invoicing.invoiced, value: "invoiced" },
    {
      label: messages.bookings.invoicing.notInvoicable,
      value: "not_invoicable",
    },
  ];
  const membershipOptions = [
    { label: copy.filters.membershipMember, value: "member" },
    { label: copy.filters.membershipExternal, value: "external" },
  ];

  const onCompanyChange = useCallback(
    (ids: string[]) => update({ companyIds: ids }),
    [update]
  );
  const onRoomChange = useCallback(
    (ids: string[]) => update({ roomIds: ids }),
    [update]
  );
  const onStatusChange = useCallback(
    (statuses: string[]) =>
      update({
        invoicingStatuses: statuses as AdminViewParams["invoicingStatuses"],
      }),
    [update]
  );
  const onMembershipChange = useCallback(
    (kinds: string[]) =>
      update({ memberships: kinds as AdminViewParams["memberships"] }),
    [update]
  );
  const onHideEventsChange = useCallback(
    (checked: boolean) => update({ includeHouseEvents: !checked }),
    [update]
  );
  const onViewChange = useCallback(
    (values: string[]) => {
      // A click on the active segment empties the group; the view stays.
      const value = values.at(-1);
      if (value !== undefined) {
        update({ view: value as AdminViewParams["view"] });
      }
    },
    [update]
  );

  return (
    <>
      {/* shrink-0: the panel is a fixed-height scrolling column; the filter
          row and the view toggle stay visible while the views scroll. */}
      <Card className="shrink-0 flex-row flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <PeriodControl params={view} today={today} />
          <FilterMultiSelect
            allLabel={copy.filters.companyAll}
            label={copy.filters.company}
            onChange={onCompanyChange}
            options={companyOptions}
            value={view.companyIds}
          />
          <FilterMultiSelect
            allLabel={copy.filters.roomAll}
            label={copy.filters.room}
            onChange={onRoomChange}
            options={roomOptions}
            value={view.roomIds}
          />
          <FilterMultiSelect
            allLabel={copy.filters.statusAll}
            label={copy.filters.status}
            onChange={onStatusChange}
            options={statusOptions}
            value={view.invoicingStatuses}
          />
          <FilterMultiSelect
            allLabel={copy.filters.membershipAll}
            label={copy.filters.membership}
            onChange={onMembershipChange}
            options={membershipOptions}
            value={view.memberships}
          />
          <Switch
            aria-label={copy.filters.hideHouseEvents}
            checked={!view.includeHouseEvents}
            onCheckedChange={onHideEventsChange}
          />
          <span className="text-sm">{copy.filters.hideHouseEvents}</span>
          <Button
            onClick={resetFilters}
            size="sm"
            type="button"
            variant="ghost"
          >
            {copy.filters.reset}
          </Button>
        </div>
        <ToggleGroup
          onValueChange={onViewChange}
          spacing={0}
          value={[view.view]}
          variant="outline"
        >
          <ToggleGroupItem value="list">{copy.view.list}</ToggleGroupItem>
          <ToggleGroupItem value="month">{copy.view.month}</ToggleGroupItem>
        </ToggleGroup>
      </Card>
      {calendar ? (
        <AdminCalendarGrid calendar={calendar} />
      ) : (
        <AdminBookingsTable params={view} rows={rows} />
      )}
    </>
  );
}
