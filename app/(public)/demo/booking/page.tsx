import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOwnCompany } from "@/lib/auth/require-company";
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
// Requires a logged-in company like the real flow; admins are sent on.
export default async function DevBookingPage() {
  if (!isDevelopment) {
    redirect("/");
  }
  await requireOwnCompany();
  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("rooms")
    .select("room_id, room_name, room_capacity")
    .eq("room_is_active", true)
    .order("room_name");

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-4 py-10">
      <DevBookingForm rooms={rooms ?? []} />
    </main>
  );
}
