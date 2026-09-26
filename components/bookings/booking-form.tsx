"use client";

// The booking dialog's form (DESIGN.md "Booking dialog", #4, #81): four
// steps over one react-hook-form instance. The slot, the add-ons, the
// booker, then the overview with the terms and "Book nu". "Næste" validates
// the step's own fields; the server re-parses everything on submit. A
// company's submit creates the hold (#2); an admin's creates the confirmed
// booking for the chosen company (#14, ADR-0023).
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type FormEvent,
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
  type FieldErrors,
  type Path,
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { createHold, type Hold, type HoldState } from "@/lib/bookings/actions";
import {
  type AdminBookingState,
  createAdminBooking,
} from "@/lib/bookings/admin-actions";
import type { SerializedPeriod } from "@/lib/bookings/availability";
import { getRoomDayPeriods } from "@/lib/bookings/availability-actions";
import type { BookingViewer } from "@/lib/bookings/viewer";
import { type AddOn, addonLines, linesTotalOre } from "@/lib/domain/addons";
import { endOptions, type Period, startSlots } from "@/lib/domain/availability";
import type {
  SpecialClosingDay,
  WeeklyOpeningHour,
} from "@/lib/domain/opening-hours";
import {
  type PriceOverviewModel,
  priceOverview,
} from "@/lib/domain/price-overview";
import { buildSnapshot } from "@/lib/domain/snapshot";
import { cphToUtc, hoursBetween } from "@/lib/domain/time";
import { formatDate, formatTime, formatWeekday } from "@/lib/format";
import {
  adminBookingSchema,
  bookingFormSchema,
} from "@/lib/validation/booking";
import type { RoomPrefill } from "@/lib/validation/room-search";
import { messages } from "@/messages/da";
import { AddOnCheckboxList, CateringAcceptance } from "./addon-selection";
import { BookerFields } from "./booker-fields";
import { DetailRow } from "./detail-row";
import { PriceOverview } from "./price-overview";
import { SlotPicker } from "./slot-picker";

const copy = messages.booking.dialog;
const DEFAULT_PARTICIPANTS = 2;

export interface DialogRoom {
  addons: AddOn[];
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

// The fields each step owns, in step order: "Næste" validates exactly
// these, and a server error on one of them returns to its step.
const STEP_FIELDS: readonly (readonly Path<BookingFormValues>[])[] = [
  ["startAt", "endAt", "participantCount"],
  ["addOnIds", "cateringAccepted"],
  ["companyId", "bookerName", "bookerEmail", "bookerPhone"],
  ["termsAccepted"],
];
export const FORM_STEP_COUNT = STEP_FIELDS.length;
const LAST_STEP = FORM_STEP_COUNT - 1;

const firstStepWithError = (fields: string[]): number =>
  STEP_FIELDS.findIndex((step) => step.some((name) => fields.includes(name)));

const errorStep = (state: BookingState): number =>
  state.status === "error"
    ? firstStepWithError(Object.keys(state.fieldErrors ?? {}))
    : -1;

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
  addOnIds: [],
  bookerEmail: "",
  bookerName: "",
  bookerPhone: "",
  cateringAccepted: false,
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
  onCreated: (bookingId: string) => void;
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
      onCreated(state.bookingId);
    }
  }, [state, onCreated, onHeld]);
  useActionError(state, form);
}

// A server error on an earlier step's field (the slot taken meanwhile, the
// email refused) takes the visitor back to that step, where the field
// shows it.
function useStepForErrors(
  state: BookingState,
  onStepChange: (step: number) => void
): void {
  useEffect(() => {
    const target = errorStep(state);
    if (target >= 0) {
      onStepChange(target);
    }
  }, [state, onStepChange]);
}

// After a refused "Næste", the step's fields revalidate as they change, so
// an error clears the moment it is fixed, as a submitted form's would.
// Returns the marker for a refused attempt; moving to another step ends
// the live validation, since the attempt was for this step only.
function useStepRevalidation(
  form: UseFormReturn<BookingFormValues>,
  step: number
): () => void {
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const attempted = attemptedStep === step;
  useEffect(() => {
    if (!attempted) {
      return;
    }
    return form.subscribe({
      callback: ({ name }) => {
        if (name) {
          form.trigger(name as Path<BookingFormValues>);
        }
      },
      formState: { values: true },
      name: STEP_FIELDS[step],
    });
  }, [attempted, form, step]);
  return useCallback(() => setAttemptedStep(step), [step]);
}

const hoursOf = (startAt: string, endAt: string): number =>
  startAt && endAt ? hoursBetween(new Date(startAt), new Date(endAt)) : 0;

const selectedAddOns = (room: DialogRoom, addOnIds: string[]): AddOn[] =>
  room.addons.filter((addOn) => addOnIds.includes(addOn.addonId));

// The price overview before there is a hold: the same arithmetic the
// snapshot uses (lines at full price, discount on the room only), from the
// prices on the page. Once "Book nu" creates the hold, the verification
// step shows the frozen overview instead (#6).
const livePriceOverview = (
  room: DialogRoom,
  values: Pick<
    BookingFormValues,
    "addOnIds" | "endAt" | "participantCount" | "startAt"
  >,
  discountPercent: number
): PriceOverviewModel => {
  const input = {
    addOnsOre: linesTotalOre(
      addonLines(
        selectedAddOns(room, values.addOnIds),
        values.participantCount || 0
      )
    ),
    discountPercent,
    hours: hoursOf(values.startAt, values.endAt),
    roomHourlyPriceOre: room.hourlyPriceOre,
  };
  return priceOverview({ ...input, totalOre: buildSnapshot(input).totalOre });
};

const addOnNames = (room: DialogRoom, addOnIds: string[]): string =>
  selectedAddOns(room, addOnIds)
    .map((addOn) => addOn.name)
    .join(", ") || copy.overview.noAddOns;

const companyName = (
  viewer: BookingViewer,
  companyId: string
): string | null =>
  viewer.kind === "admin"
    ? (viewer.companies.find((company) => company.companyId === companyId)
        ?.displayName ?? null)
    : null;

const discountFor = (viewer: BookingViewer, companyId: string): number =>
  viewer.kind === "company"
    ? viewer.discountPercent
    : (viewer.companies.find((company) => company.companyId === companyId)
        ?.discountPercent ?? 0);

const schemaFor = (viewer: BookingViewer) =>
  viewer.kind === "admin" ? adminBookingSchema : bookingFormSchema;

// "Book nu" holds the room for a member; an admin's booking is created and
// confirmed in one go.
const submitCopyFor = (viewer: BookingViewer) =>
  viewer.kind === "admin" ? messages.booking.admin : copy;

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

// The box stays on the label's line; the error goes under the label.
function TermsField({
  className,
  control,
}: {
  className?: string;
  control: Control<BookingFormValues>;
}) {
  const { field, fieldState } = useController({
    control,
    name: "termsAccepted",
  });
  return (
    <Field
      className={className}
      data-invalid={fieldState.invalid}
      orientation="horizontal"
    >
      <Checkbox
        aria-invalid={fieldState.invalid}
        checked={field.value}
        id="booking-terms"
        name={field.name}
        onCheckedChange={field.onChange}
      />
      <FieldContent>
        <FieldLabel className="font-normal" htmlFor="booking-terms">
          {copy.terms}
        </FieldLabel>
        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
      </FieldContent>
    </Field>
  );
}

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

type SlotSelection = ReturnType<typeof useSlotSelection>;

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
  return { pending, state, submit };
}

// Step 1: the day, start and end, and the headcount.
function SlotStep({
  control,
  room,
  slot,
}: {
  control: Control<BookingFormValues>;
  room: DialogRoom;
  slot: SlotSelection;
}) {
  return (
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
    </SlotPicker>
  );
}

// Step 2: the add-ons, then the catering rule, which must be actively
// accepted (#7, Bilag 1 "Forplejning og hospitality").
function ExtrasStep({
  addOns,
  control,
  errors,
}: {
  addOns: AddOn[];
  control: Control<BookingFormValues>;
  errors: FieldErrors<BookingFormValues>;
}) {
  return (
    // Two columns from md up, two to one: the add-ons left, the catering
    // rule right (mockup of 2026-09-23 in #81). Stacked below md.
    <div className="grid gap-6 md:grid-cols-[2fr_2fr]">
      <AddOnCheckboxList
        addOns={addOns}
        control={control}
        error={errors.addOnIds?.message}
        name="addOnIds"
      />
      <CateringAcceptance
        control={control}
        error={errors.cateringAccepted?.message}
        name="cateringAccepted"
      />
    </div>
  );
}

// Step 3: why a person is asked for, then the responsible booker, and for
// an admin the company first. Only members read about the code: an
// admin's booking is confirmed without one (ADR-0023).
function BookerStep({
  control,
  viewer,
}: {
  control: Control<BookingFormValues>;
  viewer: BookingViewer;
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">
        {copy.bookerIntro}
        {viewer.kind === "company" ? ` ${copy.bookerVerify}` : ""}
      </p>
      {viewer.kind === "admin" ? (
        <CompanyField control={control} viewer={viewer} />
      ) : null}
      <BookerFields control={control} />
    </div>
  );
}

// Step 4: the choices read back, the price, and the terms.
function OverviewStep({
  control,
  price,
  room,
  viewer,
}: {
  control: Control<BookingFormValues>;
  price: PriceOverviewModel;
  room: DialogRoom;
  viewer: BookingViewer;
}) {
  const [
    startAt,
    endAt,
    participantCount,
    addOnIds,
    bookerName,
    bookerEmail,
    bookerPhone,
    companyId,
  ] = useWatch({
    control,
    name: [
      "startAt",
      "endAt",
      "participantCount",
      "addOnIds",
      "bookerName",
      "bookerEmail",
      "bookerPhone",
      "companyId",
    ],
  });
  const company = companyName(viewer, companyId);
  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* The rows centred in the space above the price, which sits at the
          bottom of the step. The terms are on the button row. */}
      <div className="flex flex-1 flex-col justify-center">
        <dl className="flex flex-col">
          <DetailRow
            label={copy.overview.date}
            value={`${formatWeekday(startAt)} ${formatDate(startAt)}`}
          />
          <DetailRow
            label={copy.overview.time}
            value={`${formatTime(startAt)} - ${formatTime(endAt)}`}
          />
          {company ? (
            <DetailRow label={copy.overview.company} value={company} />
          ) : null}
          <DetailRow
            label={copy.overview.participants}
            value={`${participantCount} ${messages.rooms.persons}`}
          />
          <DetailRow
            label={copy.overview.addOns}
            value={addOnNames(room, addOnIds)}
          />
          <DetailRow
            label={copy.overview.booker}
            value={
              <span className="flex flex-col items-end text-right">
                <span>{bookerName}</span>
                <span className="text-muted-foreground text-xs">
                  {bookerEmail} · {bookerPhone}
                </span>
              </span>
            }
          />
        </dl>
      </div>
      <PriceOverview model={price} />
    </div>
  );
}

interface StepBodyProps {
  control: Control<BookingFormValues>;
  errors: FieldErrors<BookingFormValues>;
  price: PriceOverviewModel;
  room: DialogRoom;
  slot: SlotSelection;
  step: number;
  viewer: BookingViewer;
}

function StepBody({
  control,
  errors,
  price,
  room,
  slot,
  step,
  viewer,
}: StepBodyProps) {
  if (step === 0) {
    return <SlotStep control={control} room={room} slot={slot} />;
  }
  if (step === 1) {
    return (
      <ExtrasStep addOns={room.addons} control={control} errors={errors} />
    );
  }
  if (step === 2) {
    return <BookerStep control={control} viewer={viewer} />;
  }
  return (
    <OverviewStep control={control} price={price} room={room} viewer={viewer} />
  );
}

// "Tilbage" from the second step on; "Næste" until the overview, where the
// submit takes its place with the terms checkbox beside it. Both submit the
// form, so Enter in a field moves on rather than booking early.
function StepNav({
  control,
  onBack,
  pending,
  step,
  submitCopy,
}: {
  control: Control<BookingFormValues>;
  onBack: () => void;
  pending: boolean;
  step: number;
  submitCopy: { submit: string; submitting: string };
}) {
  const last = step === LAST_STEP;
  return (
    <div className="flex items-center justify-between gap-4">
      {step > 0 ? (
        <Button onClick={onBack} type="button" variant="outline">
          {copy.back}
        </Button>
      ) : null}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        {last ? <TermsField className="w-auto" control={control} /> : null}
        {last ? (
          <PendingButton
            idleLabel={submitCopy.submit}
            pending={pending}
            pendingLabel={submitCopy.submitting}
            type="submit"
          />
        ) : (
          <Button type="submit">{copy.next}</Button>
        )}
      </div>
    </div>
  );
}

interface BookingFormProps extends ResultHandlers {
  initialDate: string;
  initialPeriods: SerializedPeriod[];
  onStepChange: (step: number) => void;
  prefill: RoomPrefill;
  room: DialogRoom;
  step: number;
  viewer: BookingViewer;
}

export function BookingForm({
  initialDate,
  initialPeriods,
  onCreated,
  onHeld,
  onStepChange,
  prefill,
  room,
  step,
  viewer,
}: BookingFormProps) {
  const form = useForm<BookingFormValues>({
    defaultValues: defaultValues(room, prefill),
    resolver: zodResolver(schemaFor(viewer)),
  });
  const { control, formState } = form;
  const slot = useSlotSelection(room, form, initialDate, initialPeriods);
  const { pending, state, submit } = useBookingSubmit(viewer, form, {
    onCreated,
    onHeld,
  });
  useStepForErrors(state, onStepChange);
  const markAttempted = useStepRevalidation(form, step);
  const [participantCount, addOnIds, companyId] = useWatch({
    control,
    name: ["participantCount", "addOnIds", "companyId"],
  });
  const price = livePriceOverview(
    room,
    { addOnIds, endAt: slot.endAt, participantCount, startAt: slot.startAt },
    discountFor(viewer, companyId)
  );
  const back = useCallback(() => onStepChange(step - 1), [onStepChange, step]);
  const next = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const valid = await form.trigger(STEP_FIELDS[step], {
        shouldFocus: true,
      });
      if (valid) {
        onStepChange(step + 1);
      } else {
        markAttempted();
      }
    },
    [form, markAttempted, onStepChange, step]
  );

  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-6"
      noValidate
      onSubmit={step === LAST_STEP ? submit : next}
    >
      {/* Every step is sized to fit the dialog's fixed height; the overflow
          is a safety net for viewports shorter than that. The gutter keeps
          focus rings clear of the clipped edge. */}
      <div className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
        <StepBody
          control={control}
          errors={formState.errors}
          price={price}
          room={room}
          slot={slot}
          step={step}
          viewer={viewer}
        />
      </div>
      <StepNav
        control={control}
        onBack={back}
        pending={pending}
        step={step}
        submitCopy={submitCopyFor(viewer)}
      />
    </form>
  );
}
