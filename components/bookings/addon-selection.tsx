"use client";

// Add-on selection for the booking flow (#7, Bilag 1 "Tilvalg"): one
// checkbox per add-on with its price (fixed total or per participant,
// ADR-0011) and description. House Service and House Host are plain
// add-ons; any guidance lives in their description (ADR-0015), which folds
// out from "Læs om <tilkøb>" so the list stays short (#4 review). Below the
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
import { formatAddonPrice } from "@/components/rooms/addon-price";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import type { AddOnPricingModel } from "@/lib/domain/addons";
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

// "Læs om House Host": the description folds out under the row. The
// trigger's chevron sits right after the text instead of at the far edge.
function AddOnAbout({
  description,
  name,
}: {
  description: string;
  name: string;
}) {
  return (
    <Accordion className="pl-7">
      <AccordionItem value="about">
        <AccordionTrigger className="justify-start! flex-none! gap-1 py-1 font-normal text-muted-foreground text-xs **:data-[slot=accordion-trigger-icon]:ml-0!">
          {messages.booking.dialog.readAbout(name)}
        </AccordionTrigger>
        <AccordionContent className="whitespace-pre-line text-muted-foreground">
          {description}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
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

// One add-on row: the checkbox, the price chip ("+ 500 kr", "Gratis",
// "+ 225 kr / person", DESIGN.md), and the fold-out description.
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
          <Badge className="rounded-full bg-secondary/40" variant="outline">
            {formatAddonPrice(addOn)}
          </Badge>
        </FieldLabel>
      </div>
      {addOn.description ? (
        <AddOnAbout description={addOn.description} name={addOn.name} />
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
