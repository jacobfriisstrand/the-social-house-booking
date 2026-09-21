# UI

shadcn on Base UI, Tailwind v4, forms, and Danish copy.

Read `docs/vendor/shadcn/installation-next.md` and `forms-react-hook-form.md`, and the `shadcn` skill's `rules/base-vs-radix.md`, before writing components.

## shadcn

- Initialised with `npx shadcn@latest init --base base` (**Base UI**, not Radix). Check with `npx shadcn@latest info`; `components.json` is committed.
- Base UI composition uses `render={<Button />}`, **not** `asChild`. `Select` needs an `items` prop; `Accordion`/`ToggleGroup` take `multiple` and array `defaultValue`s; `Slider` takes a scalar. The skill's `base-vs-radix.md` lists every difference — follow it.
- `components/ui/` is owned code: edit freely, never re-run `shadcn add` over an edited component. Feature components live in `components/<feature>/`; page-only pieces sit next to their route.
- Icons: `lucide-react`. Class merging: `cn()` from `lib/utils.ts`. Biome sorts Tailwind classes in `className` and `cn()`; don't fight the order.
- Style: the default `new-york` preset; theme tokens in `app/globals.css` only. Visual rules (palette, type scale, shell, screens) are in `docs/design/DESIGN.md`; that file and globals.css change together.

## Forms

`react-hook-form` + `zod` + `@hookform/resolvers/zod` + shadcn `Field`/`Controller` (the current guide, not the older `Form`/`FormField` wrapper). The zod schema is defined once in `lib/validation/<feature>.ts` and used by both the client form and the server action; the action re-parses on the server, always. Submit through a Server Action with `useActionState`/`useTransition` for pending state; show server errors through the field API, not `alert`.

Booking form specifics: date, start, end in 30-minute steps (`lib/domain/time.ts` produces the options), participant count drives capacity and per-participant add-ons, terms checkbox is required and records the accepted terms version.

### Inputs with trailing controls use `InputGroup`

A control inside an input (copy button, icon, text prefix/suffix) is composed with the shadcn `InputGroup`, not a `trailing`/`addon` prop on `TextField`. Seeing a bare input with a button hovering beside it is a smell.

- Wrap the control with `InputGroup`, and use `InputGroupInput`/`InputGroupTextarea` — never a raw `Input`/`Textarea` inside a group.
- The button sits in an `InputGroupAddon align="inline-end"` (addon comes after the control in the DOM; `align` positions it) and uses `InputGroupButton` + `size="icon-xs"`.
- The addon shares the input's border, height, and focus ring; no manual flex/absolute positioning.

```tsx
// components/forms/text-field.tsx stays a plain labelled input; the group
// lives in the feature component, wired with useController.
function WifiPasswordField({ control }: { control: Control<SettingsValues> }) {
  const { field, fieldState } = useController({ control, name: "wifiPassword" });
  const id = "field-wifiPassword";

  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={id}>{labels.wifiPassword}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          aria-invalid={fieldState.invalid}
          id={id}
          name={field.name}
          onBlur={field.onBlur}
          onChange={field.onChange}
          ref={field.ref}
          type="password"
          value={field.value}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton aria-label={labels.copyPassword} size="icon-xs">
            <CopyIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  );
}
```

See `components/settings/wifi-form.tsx` for the full example.

## Copy and language

- All user-visible text is Danish (ADR-0016) and lives in `messages/da.ts`, keyed by feature (`messages.booking.submit`). Components import from there; no Danish string literals in components. This is what makes an English `messages/en.ts` possible in v2.
- Email copy is the exception: it lives in `emails/templates/` (see `email.md`).
- Use the glossary's terms (`CONTEXT.md`) for every label and identifier: *booker* not user, *company* not customer, *add-on* not extra, *cancellation* not delete.
- Formatting helpers in `lib/format.ts`: `formatOre(ore)` → `1.200,00 kr`, `formatDateTime(instant)` in `Europe/Copenhagen`, always suffix prices with the excl. VAT label from `messages`.

## Rendering

Server components by default; `"use client"` only for interactivity. Fetch in the server component and pass data down; no client-side data fetching for first render. Follow the `vercel-react-best-practices` skill for anything beyond that. Mobile first: the spec requires phone, tablet, and desktop, plus "add to home screen" (web manifest in `app/manifest.ts`).
