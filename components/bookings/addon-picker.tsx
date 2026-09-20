"use client";

import { useCallback } from "react";
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
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import type { PublicAddon } from "@/lib/rooms/public-data";
import { messages } from "@/messages/da";

interface AddonPickerProps {
  addons: PublicAddon[];
  onChange: (addonIds: string[]) => void;
  value: string[];
}

const copy = messages.booking.dialog;

// "Læs om House Host": the add-on's description folds out under its row,
// so the list stays short until someone wants the details. The trigger's
// chevron sits right after the text instead of at the far edge.
function AddonAbout({
  description,
  name,
}: {
  description: string;
  name: string;
}) {
  return (
    <Accordion>
      <AccordionItem value="about">
        <AccordionTrigger className="justify-start! flex-none! gap-1 py-1 font-normal text-muted-foreground text-xs **:data-[slot=accordion-trigger-icon]:ml-0!">
          {copy.readAbout(name)}
        </AccordionTrigger>
        <AccordionContent className="whitespace-pre-line text-muted-foreground">
          {description}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function AddonRow({
  addon,
  checked,
  onToggle,
}: {
  addon: PublicAddon;
  checked: boolean;
  onToggle: (addonId: string, checked: boolean) => void;
}) {
  const id = `addon-${addon.addonId}`;
  const handleChange = useCallback(
    (next: boolean) => onToggle(addon.addonId, next),
    [addon.addonId, onToggle]
  );
  return (
    <Field orientation="horizontal">
      <Checkbox checked={checked} id={id} onCheckedChange={handleChange} />
      <FieldContent>
        <FieldLabel className="font-normal" htmlFor={id}>
          {addon.name}
          <Badge className="rounded-full bg-secondary/40" variant="outline">
            {formatAddonPrice(addon)}
          </Badge>
        </FieldLabel>
        {addon.description ? (
          <AddonAbout description={addon.description} name={addon.name} />
        ) : null}
      </FieldContent>
    </Field>
  );
}

// "Tilkøb" as checkboxes with price chips (DESIGN.md booking dialog). No
// pre-selection and no recommendation (ADR-0015).
export function AddonPicker({ addons, onChange, value }: AddonPickerProps) {
  const handleToggle = useCallback(
    (addonId: string, checked: boolean) =>
      onChange(
        checked
          ? [...value, addonId]
          : value.filter((selected) => selected !== addonId)
      ),
    [onChange, value]
  );
  return (
    <FieldSet>
      <FieldLegend variant="label">{copy.addonsTitle}</FieldLegend>
      {addons.length === 0 ? (
        <FieldDescription>{copy.addonsEmpty}</FieldDescription>
      ) : (
        <FieldGroup className="gap-3">
          {addons.map((addon) => (
            <AddonRow
              addon={addon}
              checked={value.includes(addon.addonId)}
              key={addon.addonId}
              onToggle={handleToggle}
            />
          ))}
        </FieldGroup>
      )}
    </FieldSet>
  );
}
