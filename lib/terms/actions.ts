"use server";

// Publishing a text (admin, #15). A version is never edited: each save
// inserts the next version, published at once, so acceptances keep
// pointing at the text the booker was shown. Written under the admin's
// session; RLS makes terms_versions admin-only for writes.
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { nextTermsVersion } from "@/lib/domain/terms";
import { createClient } from "@/lib/supabase/server";
import {
  type FormError,
  type FormState,
  invalidFormState,
} from "@/lib/validation/form-state";
import { type TermsFormValues, termsFormSchema } from "@/lib/validation/terms";
import { messages } from "@/messages/da";

const { errors } = messages.terms.admin;

type SessionClient = Awaited<ReturnType<typeof createClient>>;

type VersionStep =
  | { ok: true; version: string }
  | { ok: false; state: FormError<TermsFormValues> };

const NO_VERSION = { terms_version_content: null, terms_version_version: null };

const saveFailed = { error: errors.saveFailed, status: "error" } as const;

// The number the text publishes as: one past its latest version, drafts
// included, since (name, version) is unique over every row. Refused when
// the text is unchanged, so a save without edits adds no version.
async function nextVersionFor(
  supabase: SessionClient,
  { content, name }: TermsFormValues
): Promise<VersionStep> {
  const { data, error } = await supabase
    .from("terms_versions")
    .select("terms_version_content, terms_version_version")
    .eq("terms_version_name", name)
    .order("terms_version_created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return { ok: false, state: saveFailed };
  }
  const latest = data ?? NO_VERSION;
  if (latest.terms_version_content === content) {
    return {
      ok: false,
      state: {
        error: errors.unchanged,
        fieldErrors: { content: [errors.unchanged] },
        status: "error",
      },
    };
  }
  return { ok: true, version: nextTermsVersion(latest.terms_version_version) };
}

export async function publishTermsVersion(
  _previousState: FormState<TermsFormValues>,
  values: TermsFormValues
): Promise<FormState<TermsFormValues>> {
  await requireAdmin();
  const parsed = termsFormSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState<TermsFormValues>(parsed.error, errors.saveFailed);
  }
  const supabase = await createClient();
  const next = await nextVersionFor(supabase, parsed.data);
  if (!next.ok) {
    return next.state;
  }
  // Two admins saving at once collide on (name, version); the second gets
  // the generic failure and saves again.
  const { error } = await supabase.from("terms_versions").insert({
    terms_version_content: parsed.data.content,
    terms_version_name: parsed.data.name,
    terms_version_published_at: new Date().toISOString(),
    terms_version_version: next.version,
  });
  if (error) {
    return saveFailed;
  }
  // The editor, and every page that links the current versions: the
  // booking dialog on Hjem and the room pages, and the member settings.
  revalidatePath("/", "layout");
  return { status: "success" };
}
