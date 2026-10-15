"use client";

// The admin add-on form (#7, Bilag 1 "Add-ons"): name, description, price
// excl. VAT in whole kroner, the fixed-vs-per-participant choice stated in
// words (ADR-0011), and the active switch. Display order is set by
// drag-and-drop on the catalogue table, not a field on the form. One
// schema with the server action (lib/validation/addons.ts).
import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useEffect } from "react";
import {
  type Control,
  type UseFormReturn,
  useController,
  useForm,
} from "react-hook-form";
import { applyFieldErrors } from "@/components/forms/field-errors";
import { PendingButton } from "@/components/forms/pending-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { type AddonFormState, saveAddon } from "@/lib/addons/actions";
import { type AddonFormValues, addonFormSchema } from "@/lib/validation/addons";
import { messages } from "@/messages/da";

const copy = messages.addons;

const initialState: AddonFormState = { status: "idle" };

export interface AddonFormInitial {
  addonId: string | null;
  description: string;
  isActive: boolean;
  name: string;
  priceOre: number;
  pricingModel: "fixed" | "per_participant";
}

// The create default; an edit carries the row's values. Whole kroner in
// the form, integer øre stored (ADR-0019).
const emptyFormValues: AddonFormValues = {
  description: "",
  isActive: true,
  name: "",
  priceKroner: 0,
  pricingModel: "fixed",
};

function initialFormValues(initial: AddonFormInitial | null): AddonFormValues {
  if (!initial) {
    return emptyFormValues;
  }
  return {
    addonId: initial.addonId ?? undefined,
    description: initial.description,
    isActive: initial.isActive,
    name: initial.name,
    priceKroner: initial.priceOre / 100,
    pricingModel: initial.pricingModel,
  };
}

// The fixed-vs-per-participant choice (ADR-0011): each option named in
// words under its radio, so the admin panel makes the distinction clear.
function PricingModelField({ control }: { control: Control<AddonFormValues> }) {
  const { field } = useController({ control, name: "pricingModel" });
  return (
    <Field>
      <FieldLabel required>{copy.fields.pricingModel}</FieldLabel>
      <RadioGroup
        name={field.name}
        onBlur={field.onBlur}
        onValueChange={field.onChange}
        ref={field.ref}
        value={field.value}
      >
        <div className="flex flex-col gap-3">
          <Field orientation="horizontal">
            <RadioGroupItem id="addon-pricing-fixed" value="fixed" />
            <FieldContent>
              <FieldLabel className="font-normal" htmlFor="addon-pricing-fixed">
                {copy.fields.pricingModelFixedShort}
              </FieldLabel>
              <FieldDescription>
                {copy.fields.pricingModelFixed}
              </FieldDescription>
            </FieldContent>
          </Field>
          <Field orientation="horizontal">
            <RadioGroupItem
              id="addon-pricing-per-participant"
              value="per_participant"
            />
            <FieldContent>
              <FieldLabel
                className="font-normal"
                htmlFor="addon-pricing-per-participant"
              >
                {copy.fields.pricingModelPerParticipantShort}
              </FieldLabel>
              <FieldDescription>
                {copy.fields.pricingModelPerParticipant}
              </FieldDescription>
            </FieldContent>
          </Field>
        </div>
      </RadioGroup>
    </Field>
  );
}

interface FlagFieldProps {
  control: Control<AddonFormValues>;
  id: string;
  label: string;
  name: "isActive";
}

function FlagField({ control, id, label, name }: FlagFieldProps) {
  const { field } = useController({ control, name });
  return (
    <Field orientation="horizontal">
      <Switch checked={field.value} id={id} onCheckedChange={field.onChange} />
      <FieldLabel className="font-normal" htmlFor={id} required>
        {label}
      </FieldLabel>
    </Field>
  );
}

// The error under an input, only while the field is invalid.
function FieldMessage({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return <FieldError errors={[{ message }]} />;
}

// The action's failure: its field errors land on the inputs when there
// are any, the toast shows the message otherwise.
function showSaveError(
  state: {
    error: string;
    fieldErrors?: Partial<Record<keyof AddonFormValues, string[]>>;
  },
  form: UseFormReturn<AddonFormValues>
): void {
  const { fieldErrors } = state;
  if (!fieldErrors || Object.keys(fieldErrors).length === 0) {
    toast.add({ title: state.error, type: "error" });
    return;
  }
  applyFieldErrors(form, fieldErrors);
}

export function AddonForm({
  initial,
  onSaved,
}: {
  initial: AddonFormInitial | null;
  // The saved add-on's id: create mode hands the caller the new id.
  onSaved: (addonId: string) => void;
}) {
  const [state, formAction, pending] = useActionState(saveAddon, initialState);
  const form = useForm<AddonFormValues>({
    defaultValues: initialFormValues(initial),
    resolver: zodResolver(addonFormSchema),
  });

  useEffect(() => {
    if (state.status === "success") {
      toast.add({ title: copy.saved, type: "success" });
      onSaved(state.addonId);
      return;
    }
    if (state.status === "error") {
      showSaveError(state, form);
    }
  }, [state, form, onSaved]);

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(() => formAction(values));
  });

  const fieldError = (key: keyof AddonFormValues): string | undefined =>
    form.formState.errors[key]?.message;

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{copy.basicSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field data-invalid={Boolean(fieldError("name"))}>
            <FieldLabel htmlFor="addon-name" required>
              {copy.fields.name}
            </FieldLabel>
            <Input
              aria-invalid={Boolean(fieldError("name"))}
              id="addon-name"
              {...form.register("name")}
            />
            <FieldMessage message={fieldError("name")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="addon-description" required={false}>
              {copy.fields.description}
            </FieldLabel>
            <Textarea
              id="addon-description"
              rows={3}
              {...form.register("description")}
            />
          </Field>
          <Field data-invalid={Boolean(fieldError("priceKroner"))}>
            <FieldLabel htmlFor="addon-price" required>
              {copy.fields.price}
            </FieldLabel>
            <Input
              aria-invalid={Boolean(fieldError("priceKroner"))}
              id="addon-price"
              inputMode="numeric"
              type="number"
              {...form.register("priceKroner", { valueAsNumber: true })}
            />
            <FieldMessage message={fieldError("priceKroner")} />
          </Field>
          <PricingModelField control={form.control} />
          <FlagField
            control={form.control}
            id="addon-is-active"
            label={copy.fields.isActive}
            name="isActive"
          />
        </CardContent>
      </Card>

      <PendingButton
        idleLabel={copy.submit}
        pending={pending}
        pendingLabel={copy.saving}
        type="submit"
      />
    </form>
  );
}
