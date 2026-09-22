"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CopyIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { type Control, useController, useForm } from "react-hook-form";
import { TextField } from "@/components/forms/text-field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { updateSettings } from "@/lib/settings/actions";
import { type SettingsValues, settingsSchema } from "@/lib/validation/settings";
import { messages } from "@/messages/da";

const labels = messages.settings;

// Copies the current password value to the clipboard and confirms with a
// toast. Disabled while the field is empty, so a blank value can never be
// copied over the shell's default.
function WifiPasswordCopyButton({ value }: { value: string }) {
  const [copying, setCopying] = useState(false);

  const handleCopy = useCallback(async (): Promise<void> => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(value);
      toast.add({ title: labels.passwordCopied, type: "success" });
    } finally {
      setCopying(false);
    }
  }, [value]);

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        <InputGroupButton
          aria-label={labels.copyPassword}
          disabled={value.length === 0 || copying}
          onClick={handleCopy}
          size="icon-xs"
        >
          <CopyIcon />
        </InputGroupButton>
      </TooltipTrigger>
      <TooltipContent>{labels.copyPassword}</TooltipContent>
    </Tooltip>
  );
}

// The password field composes an InputGroup so the copy button shares the
// input's border and focus ring (docs/agents/ui.md).
function WifiPasswordField({ control }: { control: Control<SettingsValues> }) {
  const { field, fieldState } = useController({
    control,
    name: "wifiPassword",
  });
  const id = "field-wifiPassword";

  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={id} required>
        {labels.wifiPassword}
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          aria-invalid={fieldState.invalid}
          id={id}
          name={field.name}
          onBlur={field.onBlur}
          onChange={field.onChange}
          ref={field.ref}
          type="text"
          value={field.value}
        />
        <InputGroupAddon align="inline-end">
          <WifiPasswordCopyButton value={field.value} />
        </InputGroupAddon>
      </InputGroup>
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  );
}

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
        <WifiPasswordField control={form.control} />
      </FieldGroup>
      <Button className="w-fit" pending={pending} type="submit">
        {pending ? labels.saving : labels.submit}
      </Button>
    </form>
  );
}
