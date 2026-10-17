"use client";

// Add-on selection for the booking flow (#7, Bilag 1 "Tilvalg"): one
// checkbox per add-on with its price (fixed total or per participant,
// ADR-0011) and description. House Service and House Host are plain
// add-ons; any guidance lives in their description (ADR-0015), which folds
// out from "Læs om <tilkøb>" so the list stays short (#4 review). A chosen
// per-participant add-on carries the quantity to order (#119). Below the
// list, the catering rule with its required acceptance checkbox: catering
// is ordered only through The Social House, and the acceptance timestamp
// is what Mail 4 (#11) repeats. The booking dialog (#4) reuses these
// fields.
import { useCallback, useState } from "react";
import {
  type Control,
  type FieldValues,
  type Path,
  useController,
  useWatch,
} from "react-hook-form";
import { QuantityPicker } from "@/components/forms/quantity-picker";
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
// The list keeps one description open at a time, so the step fits the
// booking dialog without scrolling (2026-09-26 in #81).
function AddOnAbout({
  description,
  name,
  onOpenChange,
  open,
}: {
  description: string;
  name: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const handleValueChange = useCallback(
    (value: unknown[]) => onOpenChange(value.length > 0),
    [onOpenChange]
  );
  return (
    <Accordion
      className="pl-7"
      onValueChange={handleValueChange}
      value={open ? ["about"] : []}
    >
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
  // The selected room's capacity: the quantity stepper never offers more
  // than it, so a transiently over-capacity participant count cannot offer
  // unbookable quantities (the server still rejects the booking itself).
  capacity: number;
  control: Control<Values>;
  error?: string;
  name: Path<Values>;
  // #119: the participant-count field, watched for the quantity inputs'
  // bounds and default. Each quantity input binds its own
  // `addOnQuantities.<id>` field; quantityError carries the record's own
  // message.
  participantsName: Path<Values>;
  quantityError?: string;
}

interface AddOnRowProps<Values extends FieldValues> {
  addOn: AddOnView;
  checked: boolean;
  control: Control<Values>;
  onAboutChange: (addonId: string | null) => void;
  onChange: (addonId: string, checked: boolean) => void;
  open: boolean;
  participantCount: number;
  quantityMax: number;
}

// #119: the quantity the customer orders of a per-participant add-on,
// 1..participantCount, shown as a −/+ stepper next to the label. It shows
// the participant count until the customer changes it, and writes nothing
// until then — the server prices the untouched line at the full headcount.
// The form's resolver prunes the untouched record key before the strict
// record schema reads it (pruneAddOnQuantities in booking-form).
function AddOnQuantitySelector<Values extends FieldValues>({
  addonId,
  control,
  max,
  participantCount,
}: {
  addonId: string;
  control: Control<Values>;
  max: number;
  participantCount: number;
}) {
  const { field } = useController({
    control,
    name: `addOnQuantities.${addonId}` as Path<Values>,
  });

  return (
    <QuantityPicker
      decreaseLabel={messages.common.quantityDecrease}
      increaseLabel={messages.common.quantityIncrease}
      label={copy.quantityLabel}
      max={max}
      onValueChange={field.onChange}
      size="icon-xs"
      value={
        typeof field.value === "number" && !Number.isNaN(field.value)
          ? field.value
          : participantCount
      }
    />
  );
}

// One add-on row: the checkbox, the price chip ("+ 500 kr", "Gratis",
// "+ 225 kr / person", DESIGN.md), the fold-out description, and — on a
// checked per-participant add-on — the quantity stepper beside the label
// (#119).
function AddOnRow<Values extends FieldValues>({
  addOn,
  checked,
  control,
  onAboutChange,
  onChange,
  open,
  participantCount,
  quantityMax,
}: AddOnRowProps<Values>) {
  const id = `add-on-${addOn.addonId}`;
  const handleCheckedChange = useCallback(
    (isChecked: boolean): void => {
      onChange(addOn.addonId, isChecked);
    },
    [onChange, addOn.addonId]
  );
  const handleAboutChange = useCallback(
    (isOpen: boolean): void => onAboutChange(isOpen ? addOn.addonId : null),
    [onAboutChange, addOn.addonId]
  );

  return (
    <Field>
      <div className="flex h-5.5 items-start gap-3">
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
        {checked && addOn.pricingModel === "per_participant" ? (
          <AddOnQuantitySelector
            addonId={addOn.addonId}
            control={control}
            max={quantityMax}
            participantCount={participantCount}
          />
        ) : null}
      </div>
      {addOn.description ? (
        <AddOnAbout
          description={addOn.description}
          name={addOn.name}
          onOpenChange={handleAboutChange}
          open={open}
        />
      ) : null}
    </Field>
  );
}

export function AddOnCheckboxList<Values extends FieldValues>({
  addOns,
  capacity,
  control,
  error,
  name,
  participantsName,
  quantityError,
}: AddOnCheckboxListProps<Values>) {
  const { field } = useController({ control, name });
  const selected = Array.isArray(field.value) ? (field.value as string[]) : [];
  const participantCount =
    Number(useWatch({ control, name: participantsName })) || 0;
  // A cleared participants field must not push the chips below 1, and an
  // over-capacity one must not balloon the row past the room's capacity —
  // the server validates both bounds against its own counts.
  const quantityMax = Math.max(1, Math.min(participantCount, capacity));
  // The add-on whose description is folded out; opening another closes it.
  const [openId, setOpenId] = useState<string | null>(null);

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
            control={control}
            key={addOn.addonId}
            onAboutChange={setOpenId}
            onChange={toggle}
            open={openId === addOn.addonId}
            participantCount={participantCount}
            quantityMax={quantityMax}
          />
        ))}
      </div>
      {error ? <FieldError errors={[{ message: error }]} /> : null}
      {quantityError ? (
        <FieldError errors={[{ message: quantityError }]} />
      ) : null}
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
        <div className="flex h-5.5 items-start gap-3">
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
