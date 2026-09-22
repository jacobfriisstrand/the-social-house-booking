"use client";

// Add-on selection for the booking flow (#7, Bilag 1 "Tilvalg"): one
// checkbox per add-on with its price (fixed total or per participant,
// ADR-0011) and description. House Service and House Host are plain
// add-ons; any guidance lives in their description (ADR-0015). Below the
// list, the catering rule with its required acceptance checkbox: catering
// is ordered only through The Social House, and the acceptance timestamp
// is what Mail 4 (#11) repeats. The booking dialog (#4) reuses these
// fields.
import { useCallback } from "react";
import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import type { AddOnPricingModel } from "@/lib/domain/addons";
import { formatKroner } from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.booking.addOns;

// The slice of the catalogue the flow shows; serialisable, server-fetched.
export interface AddOnView {
  addonId: string;
  description: string | null;
  name: string;
  priceOre: number;
  pricingModel: AddOnPricingModel;
}

// "+ 500 kr" / "+ 225 kr pr. deltager" (DESIGN.md room detail chips).
function priceLabel(addOn: AddOnView): string {
  const price = `+ ${formatKroner(addOn.priceOre)}`;
  return addOn.pricingModel === "per_participant"
    ? `${price} ${copy.perParticipant}`
    : price;
}

interface AddOnCheckboxListProps<Values extends FieldValues> {
  addOns: AddOnView[];
  control: Control<Values>;
  error?: string;
  name: Path<Values>;
}

interface AddOnRowProps {
  addOn: AddOnView;
  checked: boolean;
  onChange: (addonId: string, checked: boolean) => void;
}

// One add-on row: the checkbox, the price chip, and the description.
function AddOnRow({ addOn, checked, onChange }: AddOnRowProps) {
  const id = `add-on-${addOn.addonId}`;
  const handleCheckedChange = useCallback(
    (isChecked: boolean): void => {
      onChange(addOn.addonId, isChecked);
    },
    [onChange, addOn.addonId]
  );

  return (
    <Field>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={checked}
          id={id}
          onCheckedChange={handleCheckedChange}
        />
        <FieldLabel className="font-normal" htmlFor={id}>
          {addOn.name}
          <span className="ml-2 text-muted-foreground text-xs tabular-nums">
            {priceLabel(addOn)}
          </span>
        </FieldLabel>
      </div>
      {addOn.description ? (
        <p className="pl-7 text-muted-foreground text-xs">
          {addOn.description}
        </p>
      ) : null}
    </Field>
  );
}

export function AddOnCheckboxList<Values extends FieldValues>({
  addOns,
  control,
  error,
  name,
}: AddOnCheckboxListProps<Values>) {
  const { field } = useController({ control, name });
  const selected = Array.isArray(field.value) ? (field.value as string[]) : [];

  const toggle = useCallback(
    (addonId: string, checked: boolean): void => {
      field.onChange(
        checked
          ? [...selected, addonId]
          : selected.filter((id) => id !== addonId)
      );
    },
    [field, selected]
  );

  if (addOns.length === 0) {
    return <p className="text-muted-foreground text-sm">{copy.empty}</p>;
  }

  return (
    <FieldSet data-invalid={Boolean(error)}>
      <FieldLegend variant="label">{copy.title}</FieldLegend>
      <div className="flex flex-col gap-3">
        {addOns.map((addOn) => (
          <AddOnRow
            addOn={addOn}
            checked={selected.includes(addOn.addonId)}
            key={addOn.addonId}
            onChange={toggle}
          />
        ))}
      </div>
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </FieldSet>
  );
}

interface CateringAcceptanceProps<Values extends FieldValues> {
  control: Control<Values>;
  error?: string;
  name: Path<Values>;
}

export function CateringAcceptance<Values extends FieldValues>({
  control,
  error,
  name,
}: CateringAcceptanceProps<Values>) {
  const { field } = useController({ control, name });
  const id = "catering-acceptance";
  const { onChange } = field;
  const handleCheckedChange = useCallback(
    (checked: boolean): void => {
      onChange(checked);
    },
    [onChange]
  );

  return (
    <FieldSet data-invalid={Boolean(error)}>
      <FieldLegend required variant="label">
        {copy.catering.title}
      </FieldLegend>
      <p className="text-muted-foreground text-sm">{copy.catering.rule}</p>
      <Field>
        <div className="flex items-start gap-3">
          <Checkbox
            aria-invalid={Boolean(error)}
            checked={field.value === true}
            id={id}
            onCheckedChange={handleCheckedChange}
          />
          <FieldLabel className="font-normal" htmlFor={id} required>
            {copy.catering.accept}
          </FieldLabel>
        </div>
      </Field>
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </FieldSet>
  );
}
