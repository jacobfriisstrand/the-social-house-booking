"use server";

// The company's master-data action (#1). Validates the nine mandatory fields
// with zod, writes the row under the company's session and RLS, and sets
// company_master_data_completed_at the first time everything passes. Mail 10
// goes out on that transition only.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwnCompany } from "@/lib/auth/require-company";
import { masterDataToUpdate } from "@/lib/domain/company-master-data";
import { createClient } from "@/lib/supabase/server";
import {
  type MasterDataValues,
  masterDataSchema,
} from "@/lib/validation/company";
import { type FormState, invalidFormState } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";
import { notifyAdminCompanyCompleted } from "./notify-admin";

export type MasterDataState = FormState<MasterDataValues>;

// Keeps an existing timestamp; sets it now on first completion.
const keepOrSetNow = (value: string | null): string =>
  value ?? new Date().toISOString();

export async function saveMasterData(
  _prevState: MasterDataState,
  values: MasterDataValues
): Promise<MasterDataState> {
  const { company } = await requireOwnCompany();
  const parsed = masterDataSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState(
      parsed.error,
      messages.masterData.errors.saveFailed
    );
  }

  const isFirstCompletion = company.company_master_data_completed_at === null;
  const supabase = await createClient();
  const updated = await supabase
    .from("companies")
    .update({
      ...masterDataToUpdate(parsed.data),
      company_master_data_completed_at: keepOrSetNow(
        company.company_master_data_completed_at
      ),
    })
    .eq("company_id", company.company_id)
    .select("*")
    .single();
  if (updated.error) {
    return { error: messages.masterData.errors.saveFailed, status: "error" };
  }

  revalidatePath("/company");
  if (isFirstCompletion) {
    await notifyAdminCompanyCompleted(updated.data);
    redirect("/");
  }
  return { status: "success" };
}
