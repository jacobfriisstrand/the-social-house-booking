"use server";

// The booking dialog asks for one room's blocked periods when the viewer
// picks another day (#4). Read-only, under the viewer's session; the
// calendar_entries view already limits what a company can see.
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { createClient } from "@/lib/supabase/server";
import { listRoomDayPeriods, type SerializedPeriod } from "./availability";

const daySchema = z.object({ date: z.iso.date(), roomId: z.guid() });

export async function getRoomDayPeriods(
  roomId: string,
  date: string
): Promise<SerializedPeriod[]> {
  await requireSession();
  const parsed = daySchema.safeParse({ date, roomId });
  if (!parsed.success) {
    return [];
  }
  const supabase = await createClient();
  return listRoomDayPeriods(supabase, parsed.data.roomId, parsed.data.date);
}
