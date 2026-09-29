"use server";

// Notice mutations (admin, #12). Server Actions, zod-parsed on the server
// with the same schema the form used (docs/agents/ui.md). Every write goes
// through the user session; RLS makes them admin-only.

import { revalidatePath } from "next/cache";
import { noticeEndsAt } from "@/lib/domain/notice";
import { createClient } from "@/lib/supabase/server";
import { type FormState, invalidFormState } from "@/lib/validation/form-state";
import {
  type NoticeFormValues,
  noticeFormSchema,
} from "@/lib/validation/notices";
import { messages } from "@/messages/da";

const { errors } = messages.notices;

export type ActionResult =
  | { status: "success" }
  | { status: "error"; error: string };

// The notice board on Hjem and the admin table both show notices.
function revalidateNotices(): void {
  revalidatePath("/");
  revalidatePath("/admin/notices");
}

const toDatabase = (values: NoticeFormValues) => ({
  notice_body: values.body,
  notice_ends_at: values.lastDay
    ? noticeEndsAt(values.lastDay).toISOString()
    : null,
  notice_is_active: values.isActive,
  notice_title: values.title,
  notice_updated_at: new Date().toISOString(),
});

export async function saveNotice(
  _previousState: FormState<NoticeFormValues>,
  values: NoticeFormValues
): Promise<FormState<NoticeFormValues>> {
  const parsed = noticeFormSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState<NoticeFormValues>(parsed.error, errors.saveFailed);
  }
  const supabase = await createClient();
  const row = toDatabase(parsed.data);
  const { error } = parsed.data.noticeId
    ? await supabase
        .from("notices")
        .update(row)
        .eq("notice_id", parsed.data.noticeId)
    : await supabase.from("notices").insert(row);
  if (error) {
    return { error: errors.saveFailed, status: "error" };
  }
  revalidateNotices();
  return { status: "success" };
}

export async function setNoticeActive(
  noticeId: string,
  isActive: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notices")
    .update({
      notice_is_active: isActive,
      notice_updated_at: new Date().toISOString(),
    })
    .eq("notice_id", noticeId);
  if (error) {
    return { error: errors.statusFailed, status: "error" };
  }
  revalidateNotices();
  return { status: "success" };
}

export async function deleteNotice(noticeId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notices")
    .delete()
    .eq("notice_id", noticeId);
  if (error) {
    return { error: errors.deleteFailed, status: "error" };
  }
  revalidateNotices();
  return { status: "success" };
}
