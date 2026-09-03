# Deploy, environments, and CI

Two environments. One Netlify site. GitHub Actions does everything that is not building the site.

Read `docs/vendor/netlify/` before changing `netlify.toml`.

## Environments

| `APP_ENV` | Git | Netlify context | Supabase project | Resend key |
|---|---|---|---|---|
| `development` | local `next dev` | — | local (`supabase start`) | development |
| `development` | `develop` | `branch-deploy` (`develop--<site>.netlify.app`) | `the-social-house-development` | development |
| `development` | PR | `deploy-preview` | `the-social-house-development` | development |
| `production` | `main` | `production` | `the-social-house-production` | production |

Deploy previews are part of the development environment: same database, same email redirect. There is no staging and no third value of `APP_ENV`.

Environment variables are set per context in Netlify; `netlify.toml` declares the contexts (`[context.production.environment]`, `[context.branch-deploy.environment]`, `[context.deploy-preview.environment]`) and enables the `develop` branch deploy. Secrets never go in `netlify.toml`.

## Branching and PRs

- `feature/<short-name>` → PR → `develop` (squash merge). `develop` → PR → `main` (merge commit; one commit per release).
- Every PR needs green CI and a human merge. Agents open PRs; they do not merge.
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `db:` for schema-only changes. Subject in English, imperative, ≤ 72 chars.
- Reference issues as `#<n>` in the body (see `issue-tracker.md`).

## CI: pull requests (`.github/workflows/ci.yml`)

Runs on every PR, in this order, all required:

1. `npm ci`
2. `npm run check` (Ultracite)
3. `npx tsc --noEmit`
4. `npm test` (Vitest)
5. `supabase start` → `supabase test db` (pgTAP; Docker is available on `ubuntu-latest`)
6. `supabase gen types typescript --local | diff - lib/supabase/database.types.ts` — fails when types are stale
7. `npm run build`

Netlify builds the deploy preview in parallel; it is not a required check.

## CI: merges (`.github/workflows/release.yml`)

On push to `develop` (GitHub Environment `development`) and `main` (GitHub Environment `production`):

1. `supabase link --project-ref $SUPABASE_PROJECT_REF`
2. `supabase db push`
3. `supabase config push`
4. `supabase functions deploy send-email --no-verify-jwt`
5. `npm run email:sync` with that environment's `RESEND_API_KEY`

Secrets per GitHub Environment: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `RESEND_API_KEY`. Netlify then builds the site from the same commit.

**Never** run steps 2–5 from a laptop against a cloud project.

## Netlify specifics

- Next.js runs through Netlify's Next runtime; no `output: 'export'`, no custom server.
- `.nvmrc` pins Node 24 for build and functions.
- The only custom function is `netlify/functions/send-reminders.mts` (scheduled, production only). Everything else is Next.
- `SENTRY_AUTH_TOKEN` is set only in Netlify, all contexts, for source-map upload.

## First-time setup of a cloud environment (once, by a human)

1. Create the Supabase project; note ref and DB password → GitHub Environment secrets.
2. Run the release workflow once (or `workflow_dispatch`) to push schema, config, function, and templates.
3. `supabase secrets set RESEND_API_KEY=… SEND_EMAIL_HOOK_SECRET=…` for the Edge Function; register the hook URL and the access token hook in the dashboard (the only dashboard actions allowed, because hooks need the deployed function URL).
4. `node --env-file=<env-vars-file> scripts/create-admin.ts --email … --password … --display-name …` with that environment's URL and secret key (Node 24 runs the TypeScript directly).
5. Set Netlify context variables from `.env.example`.
