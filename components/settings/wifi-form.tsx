"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/forms/text-field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { updateSettings } from "@/lib/settings/actions";
import { type SettingsValues, settingsSchema } from "@/lib/validation/settings";
import { messages } from "@/messages/da";

const labels = messages.settings;

// Admin edit of the Wi-Fi credentials the shell footer shows. The action
// revalidates the layout, so every shell page picks the new values up.
export function WifiForm({ defaultValues }: { defaultValues: SettingsValues }) {
  const form = useForm<SettingsValues>({
    defaultValues,
    resolver: zodResolver(settingsSchema),
  });
  const { pending, submit } = useFormAction({
    action: updateSettings,
    form,
    successMessage: labels.saved,
  });

  return (
    <form className="flex flex-col gap-6" onSubmit={submit}>
      <FieldGroup>
        <TextField
          control={form.control}
          label={labels.wifiNetwork}
          name="wifiNetwork"
        />
        <TextField
          control={form.control}
          label={labels.wifiPassword}
          name="wifiPassword"
        />
      </FieldGroup>
      <Button pending={pending} type="submit">
        {pending ? labels.saving : labels.submit}
      </Button>
    </form>
  );
}
