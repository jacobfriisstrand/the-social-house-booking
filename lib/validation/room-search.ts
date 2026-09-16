// The room search (#4, ADR-0009): date, start, end and participant count
// travel in the URL of /rooms so a result page can be shared and reloaded.
// Keys are Danish because the URL is user-visible (DESIGN.md "Book lokale").
import { z } from "zod";

const wallClock = z.string().regex(/^\d{2}:\d{2}$/);

export const roomSearchSchema = z.object({
  dato: z.iso.date(),
  fra: wallClock,
  lokale: z.guid().optional(),
  personer: z.coerce.number().int().min(1),
  til: wallClock,
});

export type RoomSearch = z.infer<typeof roomSearchSchema>;

type SearchParams = Record<string, string | string[] | undefined>;

// A page's searchParams as a search, or null when they are absent or
// malformed (the page then shows every room).
export function parseRoomSearch(params: SearchParams): RoomSearch | null {
  const parsed = roomSearchSchema.safeParse(params);
  return parsed.success ? parsed.data : null;
}

function searchParamsOf(search: Partial<RoomSearch>): URLSearchParams {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  return query;
}

export function roomSearchQuery(search: Partial<RoomSearch>): string {
  const text = searchParamsOf(search).toString();
  return text.length === 0 ? "" : `?${text}`;
}

// What the room detail page accepts to pre-fill and open the booking
// dialog: any subset of the search, plus a bare date and start from an
// empty slot on the day grid.
export const roomPrefillSchema = roomSearchSchema.partial();

export type RoomPrefill = z.infer<typeof roomPrefillSchema>;

export function parseRoomPrefill(params: SearchParams): RoomPrefill {
  const parsed = roomPrefillSchema.safeParse(params);
  return parsed.success ? parsed.data : {};
}
