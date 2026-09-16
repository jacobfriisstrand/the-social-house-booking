"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useEffect } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { z } from "zod";
import {
  BookerSlotFields,
  devSlotFields,
  NativeSelectField,
  toInstants,
} from "@/components/bookings/dev-fields";
import { applyFieldErrors } from "@/components/forms/field-errors";
import { PendingButton } from "@/components/forms/pending-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import {
  type AdminBookingState,
  createAdminBooking,
} from "@/lib/bookings/admin-actions";
import { bookerFields } from "@/lib/validation/booking";
import { messages } from "@/messages/da";

const copy = messages.booking;

const devFormSchema = z.object({
  ...bookerFields,
  ...devSlotFields,
  companyId: z.string().min(1, copy.errors.required),
});
type DevFormValues = z.infer<typeof devFormSchema>;

interface CompanyOption {
  company_display_name: string;
  company_id: string;
  company_membership_status: "external" | "member";
}

interface RoomOption {
  room_capacity: number;
  room_id: string;
  room_name: string;
}

const initialState: AdminBookingState = { status: "idle" };

// Every result ends in a toast: the booking number on success (and a clean
// form for the next one), the error and its field errors otherwise.
function useBookingResult(
  state: AdminBookingState,
  form: UseFormReturn<DevFormValues>
): void {
  useEffect(() => {
    if (state.status === "created") {
      toast.add({
        title: copy.admin.created(state.bookingNumber),
        type: "success",
      });
      form.reset();
    } else if (state.status === "error") {
      toast.add({ title: state.error, type: "error" });
      applyFieldErrors(form, state.fieldErrors ?? {});
    }
  }, [state, form]);
}

const companyOptions = (companies: CompanyOption[]) =>
  companies.map((company) => ({
    label: `${company.company_display_name} (${messages.companies.membership[company.company_membership_status]})`,
    value: company.company_id,
  }));

const roomOptions = (rooms: RoomOption[]) =>
  rooms.map((room) => ({
    label: `${room.room_name} (${room.room_capacity})`,
    value: room.room_id,
  }));

const firstCompanyId = (companies: CompanyOption[]): string =>
  companies[0]?.company_id ?? "";
const firstRoomId = (rooms: RoomOption[]): string => rooms[0]?.room_id ?? "";

const defaultValues = (
  companies: CompanyOption[],
  rooms: RoomOption[]
): DevFormValues => ({
  bookerEmail: "",
  bookerName: "",
  bookerPhone: "",
  companyId: firstCompanyId(companies),
  endAt: "",
  participantCount: 2,
  roomId: firstRoomId(rooms),
  startAt: "",
});

export function AdminBookingForm({
  companies,
  rooms,
}: {
  companies: CompanyOption[];
  rooms: RoomOption[];
}) {
  const [state, formAction, pending] = useActionState(
    createAdminBooking,
    initialState
  );
  const form = useForm<DevFormValues>({
    defaultValues: defaultValues(companies, rooms),
    resolver: zodResolver(devFormSchema),
  });

  useBookingResult(state, form);

  const submit = form.handleSubmit((values) =>
    startTransition(() => formAction(toInstants(values)))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.admin.demo.title}</CardTitle>
        <CardDescription>{copy.admin.demo.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-6" noValidate onSubmit={submit}>
          <FieldGroup>
            <NativeSelectField
              control={form.control}
              label={copy.admin.fields.company}
              name="companyId"
              options={companyOptions(companies)}
            />
            <NativeSelectField
              control={form.control}
              label={copy.fields.room}
              name="roomId"
              options={roomOptions(rooms)}
            />
            <BookerSlotFields control={form.control} />
          </FieldGroup>
          <PendingButton
            idleLabel={copy.admin.submit}
            pending={pending}
            pendingLabel={copy.admin.submitting}
            type="submit"
          />
        </form>
      </CardContent>
    </Card>
  );
}
