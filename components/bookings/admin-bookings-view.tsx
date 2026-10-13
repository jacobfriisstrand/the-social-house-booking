"use client";

import { CalendarIcon, CheckIcon, ListIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
// Bookinger (admin), the shell around the two views (#9, DESIGN.md
// "Bookinger (admin)"): the filter row, the view toggle and the list or
// the calendar. Every control writes its change to the URL, so the two
// views share one state and a switch keeps the filters; the server re-reads
// the set. The list's sorting, selection and bulk mark live with the table
// (admin-bookings-table.tsx); the calendar's month grid and its stepper are
// admin-calendar-grid.tsx.
import type * as React from "react";
import { useCallback, useRef, useState, useTransition } from "react";
import type { DateRange } from "react-day-picker";
import { da } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  selectTriggerBox,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { AdminCalendarCell } from "@/lib/bookings/admin-calendar";
import type { AdminFilterOptions } from "@/lib/bookings/admin-data";
import {
  type AdminViewParams,
  adminViewHref,
  windowAround,
} from "@/lib/bookings/admin-view-params";
import { dateToIso, isoToDate } from "@/lib/calendar-date";
import type { AdminBookingRow } from "@/lib/domain/admin-bookings";
import { nextPeriodDraft } from "@/lib/domain/period-range";
import { formatDateString, formatMonthYear } from "@/lib/format";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";
import { AdminBookingsTable } from "./admin-bookings-table";
import { AdminCalendarGrid } from "./admin-calendar-grid";

const copy = messages.bookings.admin;

/** What the server built for the calendar: the month's compact cells. */
export interface AdminCalendarModel {
  cells: AdminCalendarCell[];
}

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
  // The x sits inside the trigger, beside the chevron. The select opens on
  // mousedown (Base UI's useClick with event: 'mousedown'), so the press
  // itself must stop before it reaches the trigger — by the time the click
  // fires, the popup is already open. preventDefault keeps the press from
  // moving focus into the trigger. The span is not focusable — no second
  // focus stop inside a button — so keyboard users clear by unticking
  // (ponytail: clear-on-Escape inside the open popup would close that gap).
  const onClearPress = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);
  const onClearClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      clear();
    },
    [clear]
  );
  return (
    <Select multiple onValueChange={onChange} value={value}>
      <SelectTrigger aria-label={label} className="w-44" size="md">
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
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
            onMouseDown={onClearPress}
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
                // The indicator span must lose to the item's own
                // *:[span]:last:flex (equal specificity, later order), so
                // the hide is important. Only the checkbox shows checked.
                className="[&_[data-slot=select-item-indicator]]:hidden!"
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

// The filter row's date range: the same box as the selects beside it
// (w-44, the select trigger's classes), a range calendar in the popover.
// The selection is a local draft: one click marks a single day and the
// picker stays open — the user closes it themselves and the close applies
// the day; a second click on another day completes the range, which
// applies at once. The x clears and applies immediately.
function signature(value: { from: string; to?: string } | null): string {
  return value ? `${value.from}|${value.to ?? value.from}` : "";
}

function PeriodRangePicker({
  onChange,
  periodFrom,
  periodTo,
}: {
  onChange: (
    periodFrom: string | undefined,
    periodTo: string | undefined
  ) => void;
  periodFrom?: string;
  periodTo?: string;
}) {
  // The picker's own draft: what the calendar shows and what a close
  // commits. Seeded from the applied range when the picker opens.
  const [draft, setDraft] = useState<{ from: string; to?: string } | null>(
    null
  );
  const [open, setOpen] = useState(false);
  // The signature of the range the URL already carries; a close that
  // changes nothing must not navigate.
  const appliedRef = useRef<string | null>(null);

  const commit = useCallback(
    (value: { from: string; to?: string } | null): void => {
      onChange(value?.from, value ? (value.to ?? value.from) : undefined);
    },
    [onChange]
  );
  const handleOpenChange = useCallback(
    (next: boolean): void => {
      if (next) {
        const applied = periodFrom
          ? { from: periodFrom, to: periodTo ?? periodFrom }
          : null;
        setDraft(applied);
        appliedRef.current = signature(applied);
      } else if (draft && signature(draft) !== appliedRef.current) {
        // A close the picker performed itself (the completed range) already
        // committed inside handleSelect; the user's own close applies the
        // draft — only when it actually moved from what is applied.
        commit(draft);
        appliedRef.current = signature(draft);
      } else if (!draft && appliedRef.current !== "") {
        commit(null);
        appliedRef.current = "";
      }
      setOpen(next);
    },
    [commit, draft, periodFrom, periodTo]
  );

  const handleSelect = useCallback(
    (range: DateRange | undefined): void => {
      // The domain rule (lib/domain/period-range.ts) absorbs rdp's quirks:
      // a single click arrives as a one-day range and a click into a
      // finished selection extends instead of restarting.
      const clicked = range?.from
        ? {
            from: dateToIso(range.from),
            to: range.to ? dateToIso(range.to) : undefined,
          }
        : null;
      const result = nextPeriodDraft(clicked, draft);
      if (result.complete) {
        commit(result.draft);
        appliedRef.current = signature(result.draft);
        setOpen(false);
      }
      setDraft(result.draft);
    },
    [commit, draft]
  );
  const onClearClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      setDraft(null);
      appliedRef.current = "";
      commit(null);
    },
    [commit]
  );
  const shownFrom = draft?.from ?? periodFrom;
  const shownTo = draft?.to ?? periodTo;
  // A draft without an end is a single day in progress; closed, the
  // applied pair reads as a single day when both ends match.
  const single =
    shownFrom !== undefined && (draft ? !draft.to : shownFrom === shownTo);
  let text: string = copy.filters.periodAll;
  if (shownFrom) {
    text = single
      ? formatDateString(shownFrom)
      : `${formatDateString(shownFrom)} – ${formatDateString(shownTo ?? shownFrom)}`;
  }

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger
        render={
          <button
            aria-label={copy.filters.period}
            className={cn(selectTriggerBox, "w-44")}
            data-size="md"
            type="button"
          />
        }
      >
        <span className="flex min-w-0 flex-1 items-center justify-end gap-0.5">
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              !shownFrom && "text-muted-foreground"
            )}
          >
            {text}
          </span>
          {shownFrom ? (
            <span
              aria-hidden="true"
              className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={onClearClick}
            >
              <XIcon className="size-3.5" />
            </span>
          ) : null}
          <CalendarIcon
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          locale={da}
          mode="range"
          onSelect={handleSelect}
          selected={
            draft
              ? {
                  from: isoToDate(draft.from),
                  // A single day stays open-ended in the calendar, so a
                  // second click widens the range instead of restarting.
                  to:
                    draft.to && draft.to !== draft.from
                      ? isoToDate(draft.to)
                      : undefined,
                }
              : undefined
          }
        />
      </PopoverContent>
    </Popover>
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
  rows: AdminBookingRow[];
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
  const [paramsOverlay, setParamsOverlay] = useState<Partial<AdminViewParams>>(
    {}
  );
  const [paramsRead, setParamsRead] = useState(paramsKey);
  if (paramsKey !== paramsRead) {
    // Fresh server params: they carry what the pushes asked for.
    setParamsRead(paramsKey);
    setParamsOverlay({});
  }
  const view: AdminViewParams = { ...params, ...paramsOverlay };

  // Every URL write is a transition: the server re-read swaps the content
  // in place, and while it is on the way `loading` swaps the views' rows
  // and month cells for skeletons — loading.tsx does not fire for a
  // search-param change.
  const [loading, startLoading] = useTransition();

  const update = useCallback(
    (changes: Partial<AdminViewParams>) => {
      // The merged overlay stands in until the props catch up, so a rapid
      // second control (or a second tick on the same one) accumulates
      // instead of clobbering.
      const merged = { ...paramsOverlay, ...changes };
      setParamsOverlay(merged);
      startLoading(() => router.push(adminViewHref({ ...params, ...merged })));
    },
    [params, paramsOverlay, router]
  );

  const resetFilters = useCallback(() => {
    setParamsOverlay({});
    startLoading(() =>
      router.push(
        adminViewHref({
          ...params,
          bookingStates: [],
          companyIds: [],
          invoicingStatuses: [],
          memberships: [],
          periodFrom: undefined,
          periodTo: undefined,
          roomIds: [],
          worklist: false,
          ...windowAround(today),
        })
      )
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
  // The booking-state buckets: Kommende and Aflyste reuse the member tabs'
  // words; Afsluttede is the admin's own bucket — cut on the end instant,
  // so it does not reuse the tabs' start-based "Tidligere".
  const bookingStateOptions = [
    { label: messages.bookings.tabs.upcoming, value: "upcoming" },
    { label: copy.filters.bookingStateFinished, value: "finished" },
    { label: messages.bookings.tabs.cancelled, value: "cancelled" },
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
  const onBookingStateChange = useCallback(
    (states: string[]) =>
      update({ bookingStates: states as AdminViewParams["bookingStates"] }),
    [update]
  );
  const onPeriodChange = useCallback(
    (periodFrom: string | undefined, periodTo: string | undefined) =>
      update({ periodFrom, periodTo }),
    [update]
  );
  const onWorklistChange = useCallback(
    (checked: boolean) => update({ worklist: checked }),
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
        <div className="flex flex-wrap items-center gap-3 max-md:*:w-full">
          {/* The worklist switch is a list tool: hidden on the month view,
              whose window the stepper owns. It rides the URL, so a switch
              away and back keeps it. */}
          {view.view === "list" ? (
            <span className="flex items-center gap-2">
              <Switch
                checked={view.worklist}
                id="admin-worklist"
                onCheckedChange={onWorklistChange}
              />
              <Label className="font-normal" htmlFor="admin-worklist">
                {copy.filters.worklist}
              </Label>
            </span>
          ) : null}
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
          <FilterMultiSelect
            allLabel={copy.filters.bookingStateAll}
            label={copy.filters.bookingState}
            onChange={onBookingStateChange}
            options={bookingStateOptions}
            value={view.bookingStates}
          />
          {/* The date range is a list tool: hidden on the month view, whose
              window the stepper owns. The range rides the URL, so a switch
              away and back keeps it. */}
          {view.view === "list" ? (
            <PeriodRangePicker
              onChange={onPeriodChange}
              periodFrom={view.periodFrom}
              periodTo={view.periodTo}
            />
          ) : null}
          <Button
            className="max-md:justify-start"
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
          <ToggleGroupItem value="list">
            <ListIcon aria-hidden="true" />
            {copy.view.list}
          </ToggleGroupItem>
          <ToggleGroupItem value="month">
            <CalendarIcon aria-hidden="true" />
            {copy.view.month}
          </ToggleGroupItem>
        </ToggleGroup>
      </Card>
      {/* The branch reads the overlay's view, not the props: a toggle flips
          view.view at once while calendar/rows stay stale for the round
          trip, and the pending surface must be the one being switched TO —
          cell skeletons for the month, row skeletons for the list. */}
      {view.view === "month" ? (
        <AdminCalendarGrid
          calendar={calendar}
          loading={loading}
          // The grid is built from the focus date; a custom Fra/Til
          // period can span months, so the title reads the focus date,
          // not the period's first day.
          monthLabel={formatMonthYear(view.focusDate)}
          onPeriodChange={update}
          params={view}
          today={today}
        />
      ) : (
        <AdminBookingsTable
          loading={loading}
          onParamChange={update}
          params={view}
          rows={rows}
        />
      )}
    </>
  );
}
