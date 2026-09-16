"use client";

import { useCallback } from "react";
import { formatAddonPrice } from "@/components/rooms/addon-price";
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
          <FieldDescription>{addon.description}</FieldDescription>
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
