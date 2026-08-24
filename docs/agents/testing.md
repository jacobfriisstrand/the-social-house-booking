# Testing

Two test suites, each owning what it is best at. Nothing else is mandated.

| Suite | Runs | Owns |
|---|---|---|
| Vitest | `npm test` | Everything in `lib/domain/`, `lib/email/sendMail.ts` rules, `lib/env.ts` parsing, `scripts/` pure helpers |
| pgTAP (`supabase test db`) | `supabase test db` | Every RLS policy, every constraint and trigger, the booking-number function, the access token hook |

No Playwright or component tests in v1.0. If a bug is found in a UI flow, the fix's test goes into whichever suite owns the logic that was wrong; if the logic was in a component, move it to `lib/domain/` first.

## Vitest

- Files are co-located: `lib/domain/pricing.ts` ↔ `lib/domain/pricing.test.ts`.
- Rule: **every exported function in `lib/domain/` has a test file**, and every branch the spec describes gets a case. Pricing, discount (room rental only, ADR-0007), cancellation fee tiers (72h/24h boundaries inclusive as the spec states, on member price — ADR-0006), buffer window (ADR-0002), opening-hours fit, add-on totals (fixed vs per participant — ADR-0011), snapshot construction (ADR-0005).
- Money assertions are on integer øre. Time inputs are ISO strings with explicit offsets; tests include a DST-crossing date.
- `lib/email/sendMail.test.ts` covers the common rules and the development redirect with a mocked Resend client.
- Config: `vitest.config.ts` at root, `environment: node`. No DOM.

## pgTAP

- Files in `supabase/tests/`, created with `supabase test new <name>`, run alphabetically; `000-setup.sql` creates fixture companies, rooms, and users.
- One file per table's policies (`companies_rls.test.sql`, …) and one per integrity rule (`bookings_no_overlap.test.sql`, `bookings_snapshot_immutable.test.sql`).
- Simulate roles with `set local role authenticated; set local request.jwt.claim.sub = '<uuid>'; set local request.jwt.claims = '{"app_role":"admin", ...}'` as shown in `docs/vendor/supabase/testing-overview.md`. Assert both directions: the owning company sees its rows, another company sees none, admin sees all.
- Runs on every PR in CI against a fresh `supabase start`.

## What "done" means for a PR

Schema change → migration + regenerated types + pgTAP test. Domain rule change → Vitest test. Email change → template + variables schema + `sendMail` test if a rule changed. Every PR passes `npm run check`, `tsc`, both suites, and `next build`.
