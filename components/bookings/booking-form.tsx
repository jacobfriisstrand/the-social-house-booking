"use client";

// The booking dialog's form (DESIGN.md "Booking dialog", #4): slot picker,
// the summary sentence, add-ons and price, the booker, terms, "Book nu". A
// company's submit creates the hold (#2); an admin's creates the confirmed
// booking for the chosen company (#14, ADR-0023).
import { zodResolver } from "@hookform/resolvers/zod";
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  type Control,
  type UseFormReturn,
  useController,
  useForm,
  useWatch,
} from "react-hook-form";
import type { z } from "zod";
import { ChoiceSelect } from "@/components/forms/choice-select";
import { PendingButton } from "@/components/forms/pending-button";
import { TextField } from "@/components/forms/text-field";
import { useActionError } from "@/components/forms/use-form-action";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { createHold, type Hold, type HoldState } from "@/lib/bookings/actions";
import {
  type AdminBookingState,
  createAdminBooking,
} from "@/lib/bookings/admin-actions";
import type { SerializedPeriod } from "@/lib/bookings/availability";
import { getRoomDayPeriods } from "@/lib/bookings/availability-actions";
import type { BookingViewer } from "@/lib/bookings/viewer";
import { totalAddOnsOre } from "@/lib/domain/addons";
import { endOptions, type Period, startSlots } from "@/lib/domain/availability";
import type {
  SpecialClosingDay,
  WeeklyOpeningHour,
} from "@/lib/domain/opening-hours";
import {
  discountAmountOre,
  memberPriceOre,
  roomTotalOre,
} from "@/lib/domain/pricing";
import { cphToUtc, hoursBetween } from "@/lib/domain/time";
import { formatDate, formatTime, formatWeekday } from "@/lib/format";
import type { PublicAddon } from "@/lib/rooms/public-data";
import {
  adminBookingSchema,
  bookingFormSchema,
} from "@/lib/validation/booking";
import type { RoomPrefill } from "@/lib/validation/room-search";
import { messages } from "@/messages/da";
import { AddonPicker } from "./addon-picker";
import { BookerFields } from "./booker-fields";
import { type PriceLines, PriceSummary } from "./price-summary";
import { SlotPicker } from "./slot-picker";

const copy = messages.booking.dialog;
const DEFAULT_PARTICIPANTS = 2;

export interface DialogRoom {
  addons: PublicAddon[];
  capacity: number;
  hourlyPriceOre: number;
  location: string | null;
  name: string;
  roomId: string;
  specialDays: SpecialClosingDay[];
  weekly: WeeklyOpeningHour[];
}

type BookingFormValues = z.infer<typeof bookingFormSchema>;
type BookingState = AdminBookingState | HoldState;
const idleState: BookingState = { status: "idle" };

const toPeriods = (periods: SerializedPeriod[]): Period[] =>
  periods.map((period) => ({
    endAt: new Date(period.endAt),
    startAt: new Date(period.startAt),
  }));

const prefillInstant = (date?: string, time?: string): string =>
  date && time ? cphToUtc(date, time).toISOString() : "";

const defaultValues = (
  room: DialogRoom,
  prefill: RoomPrefill
): BookingFormValues => ({
  addonIds: [],
  bookerEmail: "",
  bookerName: "",
  bookerPhone: "",
  companyId: "",
  endAt: prefillInstant(prefill.dato, prefill.til),
  participantCount: prefill.personer ?? DEFAULT_PARTICIPANTS,
  roomId: room.roomId,
  startAt: prefillInstant(prefill.dato, prefill.fra),
  termsAccepted: false,
});

// Blocked periods per day: the initial day comes from the server, others
// are fetched on demand and kept for the dialog's lifetime.
function useDayPeriods(
  roomId: string,
  initialDate: string,
  initialPeriods: SerializedPeriod[]
) {
  const [cache, setCache] = useState<Record<string, Period[]>>(() => ({
    [initialDate]: toPeriods(initialPeriods),
  }));
  const [loading, startLoading] = useTransition();
  const load = useCallback(
    (date: string) =>
      startLoading(async () => {
        const periods = await getRoomDayPeriods(roomId, date);
        setCache((current) => ({ ...current, [date]: toPeriods(periods) }));
      }),
    [roomId]
  );
  return { cache, load, loading };
}

interface ResultHandlers {
  onCreated: () => void;
  onHeld: (hold: Hold) => void;
}

// Applies the action result: a hold hands over to the verification step, a
// created booking toasts its number, an error toasts and lands its field
// errors.
function useBookingResult(
  state: BookingState,
  form: UseFormReturn<BookingFormValues>,
  { onCreated, onHeld }: ResultHandlers
): void {
  useEffect(() => {
    if (state.status === "held") {
      onHeld(state.hold);
    }
    if (state.status === "created") {
      toast.add({
        title: messages.booking.admin.created(state.bookingNumber),
        type: "success",
      });
      onCreated();
    }
  }, [state, onCreated, onHeld]);
  useActionError(state, form);
}

const hoursOf = (startAt: string, endAt: string): number =>
  startAt && endAt ? hoursBetween(new Date(startAt), new Date(endAt)) : 0;

const selectedAddOns = (room: DialogRoom, addonIds: string[]) =>
  room.addons
    .filter((addon) => addonIds.includes(addon.addonId))
    .map((addon) => ({
      kind: addon.pricingModel,
      name: addon.name,
      priceOre: addon.priceOre,
    }));

const priceLines = (
  room: DialogRoom,
  values: Pick<
    BookingFormValues,
    "addonIds" | "endAt" | "participantCount" | "startAt"
  >,
  discountPercent: number
): PriceLines => {
  const roomOre = roomTotalOre(
    room.hourlyPriceOre,
    hoursOf(values.startAt, values.endAt)
  );
  const addonsOre = totalAddOnsOre(
    selectedAddOns(room, values.addonIds),
    values.participantCount || 0
  );
  return {
    addonsOre,
    discountOre: discountAmountOre(roomOre, discountPercent),
    discountPercent,
    roomOre,
    subtotalOre: roomOre + addonsOre,
    totalOre: memberPriceOre(roomOre, discountPercent) + addonsOre,
  };
};

const summarySentence = (startAt: string, endAt: string): string =>
  startAt && endAt
    ? copy.summary(
        formatWeekday(startAt),
        formatDate(startAt),
        formatTime(startAt),
        formatTime(endAt)
      )
    : copy.summaryEmpty;

function CompanyField({
  control,
  viewer,
}: {
  control: Control<BookingFormValues>;
  viewer: Extract<BookingViewer, { kind: "admin" }>;
}) {
  const { field, fieldState } = useController({ control, name: "companyId" });
  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="booking-company">
        {messages.booking.admin.fields.company}
      </FieldLabel>
      <ChoiceSelect
        id="booking-company"
        invalid={fieldState.invalid}
        items={viewer.companies.map((company) => ({
          label: `${company.displayName} (${messages.companies.membership[company.membershipStatus]})`,
          value: company.companyId,
        }))}
        onChange={field.onChange}
        placeholder={messages.booking.admin.fields.companyPlaceholder}
        value={field.value || null}
      />
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  );
}

function TermsField({ control }: { control: Control<BookingFormValues> }) {
  const { field, fieldState } = useController({
    control,
    name: "termsAccepted",
  });
  return (
    <Field data-invalid={fieldState.invalid} orientation="horizontal">
      <Checkbox
        aria-invalid={fieldState.invalid}
        checked={field.value}
        id="booking-terms"
        name={field.name}
        onCheckedChange={field.onChange}
      />
      <div className="flex flex-col gap-1">
        <FieldLabel className="font-normal" htmlFor="booking-terms">
          {copy.terms}
        </FieldLabel>
        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
      </div>
    </Field>
  );
}

const discountFor = (viewer: BookingViewer, companyId: string): number =>
  viewer.kind === "company"
    ? viewer.discountPercent
    : (viewer.companies.find((company) => company.companyId === companyId)
        ?.discountPercent ?? 0);

// The slot the form holds: the day, its blocked periods, the start-slot
// list and end options for it, and the handlers that keep start and end
// consistent when the day or the start changes.
function useSlotSelection(
  room: DialogRoom,
  form: UseFormReturn<BookingFormValues>,
  initialDate: string,
  initialPeriods: SerializedPeriod[]
) {
  const { control, setValue } = form;
  const [date, setDate] = useState(initialDate);
  const { cache, load, loading } = useDayPeriods(
    room.roomId,
    initialDate,
    initialPeriods
  );
  const [startAt, endAt] = useWatch({ control, name: ["startAt", "endAt"] });
  const blocked = cache[date];
  const opening = useMemo(
    () => ({
      blocked: blocked ?? [],
      specialDays: room.specialDays,
      weekly: room.weekly,
    }),
    [blocked, room.specialDays, room.weekly]
  );
  const slots = useMemo(
    () => startSlots({ ...opening, date, now: new Date() }),
    [opening, date]
  );
  const ends = useMemo(
    () =>
      startAt ? endOptions({ ...opening, startAt: new Date(startAt) }) : [],
    [opening, startAt]
  );
  const handleDateChange = useCallback(
    (next: string) => {
      setDate(next);
      if (!cache[next]) {
        load(next);
      }
      setValue("startAt", "");
      setValue("endAt", "");
    },
    [cache, load, setValue]
  );
  const handleStartChange = useCallback(
    (next: string) => {
      setValue("startAt", next, { shouldValidate: true });
      const nextEnds = endOptions({ ...opening, startAt: new Date(next) });
      if (!nextEnds.some((end) => end.toISOString() === endAt)) {
        setValue("endAt", nextEnds[0]?.toISOString() ?? "");
      }
    },
    [opening, endAt, setValue]
  );
  const handleEndChange = useCallback(
    (next: string) => setValue("endAt", next, { shouldValidate: true }),
    [setValue]
  );
  return {
    date,
    endAt,
    ends,
    handleDateChange,
    handleEndChange,
    handleStartChange,
    loading,
    slots,
    startAt,
  };
}

// Submit goes to the hold action or the admin action by viewer; the result
// is applied by useBookingResult.
function useBookingSubmit(
  viewer: BookingViewer,
  form: UseFormReturn<BookingFormValues>,
  handlers: ResultHandlers
) {
  const submitBooking = useCallback(
    (_prev: BookingState, values: BookingFormValues): Promise<BookingState> =>
      viewer.kind === "admin"
        ? createAdminBooking({ status: "idle" }, values)
        : createHold({ status: "idle" }, values),
    [viewer.kind]
  );
  const [state, formAction, pending] = useActionState(submitBooking, idleState);
  useBookingResult(state, form, handlers);
  const submit = form.handleSubmit((values) =>
    startTransition(() => formAction(values))
  );
  return { pending, submit };
}

interface BookingFormProps extends ResultHandlers {
  initialDate: string;
  initialPeriods: SerializedPeriod[];
  prefill: RoomPrefill;
  room: DialogRoom;
  viewer: BookingViewer;
}

export function BookingForm({
  initialDate,
  initialPeriods,
  onCreated,
  onHeld,
  prefill,
  room,
  viewer,
}: BookingFormProps) {
  const schema =
    viewer.kind === "admin" ? adminBookingSchema : bookingFormSchema;
  const form = useForm<BookingFormValues>({
    defaultValues: defaultValues(room, prefill),
    resolver: zodResolver(schema),
  });
  const { control, setValue } = form;
  const slot = useSlotSelection(room, form, initialDate, initialPeriods);
  const { pending, submit } = useBookingSubmit(viewer, form, {
    onCreated,
    onHeld,
  });
  const [participantCount, addonIds, companyId] = useWatch({
    control,
    name: ["participantCount", "addonIds", "companyId"],
  });
  const handleAddonsChange = useCallback(
    (next: string[]) => setValue("addonIds", next),
    [setValue]
  );
  const lines = priceLines(
    room,
    { addonIds, endAt: slot.endAt, participantCount, startAt: slot.startAt },
    discountFor(viewer, companyId)
  );

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={submit}>
      <SlotPicker
        date={slot.date}
        endAt={slot.endAt}
        endOptions={slot.ends}
        loading={slot.loading}
        onDateChange={slot.handleDateChange}
        onEndChange={slot.handleEndChange}
        onStartChange={slot.handleStartChange}
        slots={slot.slots}
        startAt={slot.startAt}
      >
        <TextField
          control={control}
          description={copy.participantsHint(room.capacity)}
          inputMode="numeric"
          label={messages.booking.fields.participantCount}
          name="participantCount"
          type="number"
        />
        {viewer.kind === "admin" ? (
          <CompanyField control={control} viewer={viewer} />
        ) : null}
      </SlotPicker>
      <p className="text-sm">{summarySentence(slot.startAt, slot.endAt)}</p>
      <div className="grid gap-6 md:grid-cols-2">
        <AddonPicker
          addons={room.addons}
          onChange={handleAddonsChange}
          value={addonIds}
        />
        <PriceSummary lines={lines} />
      </div>
      <BookerFields control={control} />
      <TermsField control={control} />
      <PendingButton
        className="w-full"
        idleLabel={copy.submit}
        pending={pending}
        pendingLabel={copy.submitting}
        size="lg"
        type="submit"
      />
    </form>
  );
}
