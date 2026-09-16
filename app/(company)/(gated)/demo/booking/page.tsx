import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { isDevelopment } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";
import { DevBookingForm } from "./form";

export const metadata: Metadata = {
  title: messages.booking.demo.title,
};

// Development harness for the booker verification flow (#2): a bare
// booking form that creates the hold, then the real verification step. The
// booking dialog (#4) replaces the form; the step and the actions stay.
// The (gated) layout requires a session with completed master data, like
// the real flow; the actions check again.
export default async function DevBookingPage() {
  if (!isDevelopment) {
    redirect("/");
  }
  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("rooms")
    .select("room_id, room_name, room_capacity")
    .eq("room_is_active", true)
    .order("room_name");

  return (
    <>
      <PageHeader title={messages.booking.demo.title} />
      <PagePanel>
        <div className="mx-auto w-full max-w-md">
          <DevBookingForm rooms={rooms ?? []} />
        </div>
      </PagePanel>
    </>
  );
}
