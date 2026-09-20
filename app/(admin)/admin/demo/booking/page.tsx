import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { AddOnView } from "@/components/bookings/addon-selection";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { listRoomAddOns } from "@/lib/bookings/addon-lines";
import { isDevelopment } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";
import { AdminBookingForm } from "./form";

export const metadata: Metadata = {
  title: messages.booking.admin.demo.title,
};

// Development harness for admin booking on a company's behalf (#14): a bare
// form over createAdminBooking(). The booking dialog (#4) replaces the form
// with a company selector for admins and deletes this route; the action
// stays. The (admin) layout requires the admin claim; the action checks
// again.
export default async function AdminDemoBookingPage() {
  if (!isDevelopment) {
    redirect("/admin");
  }
  const supabase = await createClient();
  const [companies, rooms] = await Promise.all([
    supabase
      .from("companies")
      .select("company_id, company_display_name, company_membership_status")
      .order("company_display_name"),
    supabase
      .from("rooms")
      .select("room_id, room_name, room_capacity")
      .eq("room_is_active", true)
      .order("room_name"),
  ]);

  // The room's offered add-ons (#7), keyed by room for the form's room
  // select.
  const roomRows = rooms.data ?? [];
  const addOnLists = await Promise.all(
    roomRows.map((room) => listRoomAddOns(supabase, room.room_id))
  );
  const addOnsByRoomId: Record<string, AddOnView[]> = {};
  for (const [index, room] of roomRows.entries()) {
    addOnsByRoomId[room.room_id] = addOnLists[index] ?? [];
  }

  return (
    <>
      <PageHeader title={messages.booking.admin.demo.title} />
      <PagePanel>
        <div className="mx-auto w-full max-w-md">
          <AdminBookingForm
            addOnsByRoomId={addOnsByRoomId}
            companies={companies.data ?? []}
            rooms={roomRows}
          />
        </div>
      </PagePanel>
    </>
  );
}
