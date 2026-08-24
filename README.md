# The Social House — booking platform

Meeting-room booking for The Social House's member and external companies. Companies book rooms, bookers verify by email code, admin manages rooms, add-ons, House Events, and invoicing basis; invoices are raised manually in e-conomic.

Spec: `docs/spec/`. Glossary: `CONTEXT.md`. Decisions: `docs/adr/`. Conventions for humans and agents: `AGENTS.md`.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn (Base UI) · Supabase · Resend · Netlify · Sentry · Ultracite · Vitest + pgTAP

## Prerequisites

- Node 24 (`nvm use` reads `.nvmrc`), npm
- Docker (for local Supabase)
- CLIs: `brew install gh supabase/tap/supabase netlify-cli`

## Run locally

```bash
npm ci
cp .env.example .env.local        # fill in from `supabase start` output; leave Sentry empty
supabase start                    # local Postgres, Auth, Studio
supabase db reset                 # apply migrations + seed (admin, rooms, companies)
npm run dev                       # http://localhost:3000
```

Local admin and company logins are in `supabase/seed.sql`. All email in development is redirected to `EMAIL_REDIRECT_TO`.

## Everyday commands

| | |
|---|---|
| `npm run check` / `npm run fix` | lint + format (Ultracite) |
| `npm test` | Vitest |
| `supabase test db` | pgTAP database tests |
| `supabase db diff -f <name>` | schema change → migration (see `docs/agents/supabase.md`) |
| `npm run db:types` | regenerate `lib/supabase/database.types.ts` |

## Environments and deploys

`develop` → development deploy (`develop--<site>.netlify.app`, development Supabase project). `main` → production. Deploy previews on PRs use the development environment. Migrations, auth config, the Edge Function, and email templates are pushed by GitHub Actions on merge — never from a laptop. Details in `docs/agents/deploy.md`.
