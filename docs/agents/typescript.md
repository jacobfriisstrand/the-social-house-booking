# TypeScript

Type modeling rules for state and data shapes. Ultracite (in `AGENTS.md`) covers lint rules; this covers the types lint can't check.

## Discriminated unions for either/or state

Never model state that is in exactly one of a few shapes as an interface with optional fields:

```ts
// Wrong: allows states that should not exist
interface State {
  status: "loading" | "success" | "error";
  data?: Booking[];
  error?: string;
}
```

This type permits `status: "error"` with no `error`, `status: "loading"` with a stale `data`, and every other combination — about a dozen states instead of three. The compiler cannot narrow anything useful off `status`.

Model it as a union of objects sharing a discriminant property:

```ts
type State =
  | { status: "loading" }
  | { status: "success"; data: Booking[] }
  | { status: "error"; error: string };
```

- `status` is the discriminant: checking it narrows to exactly one branch.
- Each branch declares its required fields; the compiler rejects `error` on the loading branch and forces `data` on the success branch.
- Exhaustive `switch` on the discriminant covers every case; adding a state breaks compile at every unhandled site.

## When to reach for one

The signal is a type (or object literal) riddled with `?` fields where the optionals are mutually exclusive. Anything modeling a fetch, a form submission, or a workflow step qualifies — e.g. `useActionState` action state: `{ status: "idle" } | { status: "success" } | { status: "error"; error: string }`, not one flat object.

Discriminated unions also apply beyond status: any data that can only be one of a few shapes (`{ kind: "room"; ... } | { kind: "add-on"; ... }`). Use a named literal field as the discriminant (`status`, `kind`), never a bare boolean pair like `isLoading` + `hasError`.
