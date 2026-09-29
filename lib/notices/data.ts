// Read-side for notices (#12). Session client + RLS: members read only the
// notices that are shown; admins read all of them.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface Notice {
  body: string;
  endsAt: string | null;
  isActive: boolean;
  noticeId: string;
  title: string;
}

type NoticeRow = Pick<
  Database["public"]["Tables"]["notices"]["Row"],
  | "notice_body"
  | "notice_ends_at"
  | "notice_id"
  | "notice_is_active"
  | "notice_title"
>;

const NOTICE_COLUMNS =
  "notice_body, notice_ends_at, notice_id, notice_is_active, notice_title";

const toNotice = (row: NoticeRow): Notice => ({
  body: row.notice_body,
  endsAt: row.notice_ends_at,
  isActive: row.notice_is_active,
  noticeId: row.notice_id,
  title: row.notice_title,
});

// Every notice, newest first: the admin's table under Opslag.
export async function listNotices(
  supabase: SupabaseClient<Database>
): Promise<Notice[]> {
  const { data, error } = await supabase
    .from("notices")
    .select(NOTICE_COLUMNS)
    .order("notice_created_at", { ascending: false })
    // Bounded: a handful of practical notices at a time.
    .limit(200);
  if (error) {
    throw new Error(`could not list notices: ${error.message}`);
  }
  return data.map(toNotice);
}

// The notices the notice board shows: on, and not past their end. RLS
// already limits members to these; the filter gives admins the same list.
export async function listShownNotices(
  supabase: SupabaseClient<Database>,
  now: Date
): Promise<Notice[]> {
  const { data, error } = await supabase
    .from("notices")
    .select(NOTICE_COLUMNS)
    .eq("notice_is_active", true)
    .or(`notice_ends_at.is.null,notice_ends_at.gt.${now.toISOString()}`)
    .order("notice_created_at", { ascending: false })
    .limit(50);
  if (error) {
    throw new Error(`could not list shown notices: ${error.message}`);
  }
  return data.map(toNotice);
}
