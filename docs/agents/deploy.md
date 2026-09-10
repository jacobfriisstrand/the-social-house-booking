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

`netlify.toml` carries the non-secret per-context values (`APP_ENV`, `NEXT_PUBLIC_SITE_URL`) under `[context.<name>.environment]`. Deploy previews get no fixed `NEXT_PUBLIC_SITE_URL`; `lib/env.ts` falls back to Netlify's `DEPLOY_PRIME_URL`. Everything else, secrets included, is set on the site per context with `netlify env:set` (see `scripts/setup-netlify-env.sh`); `RESEND_FROM` stays there too because it changes with the Resend account at go-live. The `develop` branch deploy is enabled in the Netlify UI, not in the toml. Secrets never go in `netlify.toml`.

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

1. `npm ci`
2. `supabase link --project-ref $SUPABASE_PROJECT_REF`
3. `supabase db push`
4. `supabase config push` — includes the Send Email Hook for that project from `[remotes.<name>.auth.hook.send_email]`, reading `SEND_EMAIL_HOOK_SECRET` through `env()`
5. `supabase functions deploy send-email --no-verify-jwt`
6. `npm run email:sync` with that environment's `RESEND_API_KEY`

Secrets per GitHub Environment: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `SEND_EMAIL_HOOK_SECRET`, `RESEND_API_KEY`. Netlify then builds the site from the same commit.

**Never** run steps 2–5 from a laptop against a cloud project.

## Netlify specifics

- Next.js runs through Netlify's Next runtime; no `output: 'export'`, no custom server.
- `.nvmrc` pins Node 24 for build and functions.
- The only custom function is `netlify/functions/send-reminders.mts` (scheduled, production only). Everything else is Next.
- `SENTRY_AUTH_TOKEN` is set only in Netlify, all contexts, for source-map upload. `SENTRY_WEBHOOK_SECRET` and `GITHUB_ISSUES_TOKEN` are production context only: the Sentry webhook points at the production URL (`stack.md`).

## First-time setup of a cloud environment (once, by a human)

1. Create the Supabase project; note ref and DB password → GitHub Environment secrets.
2. Run the release workflow once (or `workflow_dispatch`) to push schema, config, function, and templates.
3. Generate the hook secret once, `v1,whsec_$(openssl rand -base64 32)`, and store it twice: as the GitHub Environment secret `SEND_EMAIL_HOOK_SECRET` (config push registers the hook with it) and as an Edge Function secret: `supabase secrets set SEND_EMAIL_HOOK_SECRET=… RESEND_API_KEY=… RESEND_FROM=… APP_ENV=… EMAIL_REDIRECT_TO=…` (`APP_ENV=production` only on the production project; `EMAIL_REDIRECT_TO` only on development). Both hooks are registered by `config push`; nothing is done in the dashboard.
4. `node --env-file=<env-vars-file> scripts/create-admin.ts --email … --password … --display-name …` with that environment's URL and secret key (Node 24 runs the TypeScript directly).
5. Run `scripts/setup-netlify-env.sh`. It walks through Supabase, Resend and Sentry and writes every context-scoped variable from `.env.example` to the linked Netlify site with the CLI (`netlify login` as the site owner first). `APP_ENV`, `NEXT_PUBLIC_SITE_URL` and `RESEND_FROM` are not part of it; they live in `netlify.toml`.
