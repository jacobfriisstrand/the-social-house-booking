"use client";

import { useCallback } from "react";
import { type Control, type Path, useController } from "react-hook-form";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  type MembershipStatus,
  membershipStatuses,
} from "@/lib/validation/company";
import { messages } from "@/messages/da";

const labels = messages.companyFields;
const names = messages.companies.membership;

interface MembershipValues {
  discountPercent: number;
  membershipStatus: MembershipStatus;
}

// Member or external, member first (#14). Choosing external zeroes the
// discount, since an external company pays full room price; the form
// disables the discount field for it.
export function MembershipField<Values extends MembershipValues>({
  control,
}: {
  control: Control<Values>;
}) {
  const { field, fieldState } = useController({
    control,
    name: "membershipStatus" as Path<Values>,
  });
  const discount = useController({
    control,
    name: "discountPercent" as Path<Values>,
  });
  const { onChange } = field;
  const setDiscount = discount.field.onChange;
  const handleChange = useCallback(
    (value: unknown) => {
      onChange(value);
      if (value === "external") {
        setDiscount(0);
      }
    },
    [onChange, setDiscount]
  );

  return (
    <FieldSet data-invalid={fieldState.invalid}>
      <FieldLegend required variant="label">
        {labels.membershipStatus}
      </FieldLegend>
      <RadioGroup
        aria-invalid={fieldState.invalid}
        name={field.name}
        onBlur={field.onBlur}
        onValueChange={handleChange}
        ref={field.ref}
        value={field.value}
      >
        <FieldGroup className="gap-3">
          {membershipStatuses.map((status) => (
            <Field key={status} orientation="horizontal">
              <RadioGroupItem
                id={`field-membershipStatus-${status}`}
                value={status}
              />
              <FieldContent>
                <FieldLabel
                  className="font-normal"
                  htmlFor={`field-membershipStatus-${status}`}
                >
                  {names[status]}
                </FieldLabel>
                <FieldDescription>
                  {labels.membershipStatusHint[status]}
                </FieldDescription>
              </FieldContent>
            </Field>
          ))}
        </FieldGroup>
      </RadioGroup>
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </FieldSet>
  );
}
