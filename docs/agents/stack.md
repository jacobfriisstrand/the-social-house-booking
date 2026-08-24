# Stack

Versions, commands, environment variables, and observability. The single reference for "what runs here".

## Versions

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node 24 (`.nvmrc`, `engines`) | Netlify default is 24; `.nvmrc` wins over every other setting. |
| Package manager | npm | Never pnpm, yarn, or bun. Commit `package-lock.json`. |
| Framework | Next.js 16 (App Router), React 19 | APIs differ from training data. Read `node_modules/next/dist/docs/` before writing framework code. |
| Styling / UI | Tailwind v4, shadcn on **Base UI** | See `ui.md`. |
| Database / Auth | Supabase (Postgres, Auth, Edge Functions) | See `supabase.md`, `auth.md`. |
| Email | Resend (Templates API, webhooks) | See `email.md`. |
| Hosting | Netlify (site, scheduled function) | See `deploy.md`. |
| Errors | Sentry via `@sentry/nextjs` | Below. |
| Lint / format | Ultracite (Biome preset) | Below. |
| Tests | Vitest (TypeScript), pgTAP via `supabase test db` (Postgres) | See `testing.md`. |

Vendor documentation is pinned in `docs/vendor/<vendor>/` with a `Source:` and `Fetched:` header. It overrides whatever you remember about these tools.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server on http://localhost:3000 (requires `supabase start` first). |
| `npm run build` / `npm start` | Production build / serve. |
| `npm run check` / `npm run fix` | Ultracite lint + format check / apply safe fixes. (Written by `npx ultracite init`.) |
| `npm test` | `vitest run`. |
| `npm run db:types` | `supabase gen types typescript --local > lib/supabase/database.types.ts`. |
| `npm run email:sync` | `scripts/sync-email-templates.ts` — create/update/publish Resend templates by alias. |
| `supabase start` / `stop` | Local Postgres + Auth + Studio in Docker. |
| `supabase db diff -f <name>` | Turn `supabase/schemas/` changes into a migration. |
| `supabase db reset` | Rebuild local DB from migrations + `seed.sql`. |
| `supabase test db` | Run pgTAP tests in `supabase/tests/`. |

Scripts not yet present in `package.json` are added when the tool they call is installed (Ultracite, Vitest, the sync script). Do not add a substitute in the meantime.

## Required local tooling

`node` 24, `npm`, `gh` (issue tracker, see `issue-tracker.md`), `supabase` CLI, `netlify` CLI, Docker (for `supabase start`). Install with Homebrew: `brew install gh supabase/tap/supabase netlify-cli`.

## Environment variables

Every variable is declared once in `.env.example` and read exactly once, in `lib/env.ts`, which validates with zod at boot and exports a typed object. **Never read `process.env` anywhere else.** Adding a variable means: `.env.example` → `lib/env.ts` → Netlify (each deploy context) → GitHub Environment secret if CI needs it.

`APP_ENV` is `development` or `production`. There is no third value. Local dev, the `develop` branch deploy, and deploy previews are all `development`.

## Linting and formatting: Ultracite

Ultracite (a Biome preset) is the only linter and formatter. `biome.jsonc` extends `ultracite/biome/core`, `react`, `next`, `vitest`. ESLint and Prettier are removed by `npx ultracite init`; never add them back or add rules that conflict with the preset. Run `npm run fix` before committing; the pre-commit hook does it on staged files. Docs: `docs/vendor/ultracite/`.

Until `ultracite init` has been run, `npm run lint` (ESLint) still exists. Do not invest in ESLint config.

## Observability: Sentry

- `@sentry/nextjs` on all three runtimes: `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts` (`register()` + `onRequestError`), `app/global-error.tsx`. `next.config.ts` wrapped in `withSentryConfig`.
- `environment` = `APP_ENV`. Sentry is **off locally**: no `NEXT_PUBLIC_SENTRY_DSN` in `.env.local`.
- `sendDefaultPii: false`. A `beforeSend` scrubber drops request bodies and any field named like `email`, `phone`, `name`, `practical_notes`, `internal_note`.
- **Never** put booker or company-contact data into `Sentry.setUser`, tags, breadcrumbs, or messages. Correlate with `company_id` and `booking_number` only.
- Source maps upload during `next build` on Netlify using `SENTRY_AUTH_TOKEN`. Not needed locally.
- The Supabase Edge Function and the Netlify scheduled function are **not** instrumented in v1.0.
- Docs: `docs/vendor/sentry/`.
