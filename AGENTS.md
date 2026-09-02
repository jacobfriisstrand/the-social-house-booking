<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# The Social House — booking platform

Meeting-room booking for member companies; The Social House invoices manually in e-conomic. Danish UI, English code. This file is the index; the linked docs are the rules.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn on **Base UI** · Supabase (Postgres, Auth, Edge Functions) · Resend · Netlify · Sentry · Ultracite (Biome) · Vitest + pgTAP · npm · Node 24.

Two environments only: `development` (local, `develop` branch, deploy previews) and `production` (`main`).

## Read before you write

1. `CONTEXT.md` — the glossary. Use its terms; never the ones it says to avoid.
2. `docs/adr/` — decisions. Touching schema or money means reading ADR-0018 to ADR-0021 first. Contradict an ADR out loud, never silently.
3. `docs/agents/<topic>.md` — conventions per area (below).
4. `docs/vendor/<vendor>/` — pinned vendor docs with `Source:` and `Fetched:` headers. **They override your training data.** Next.js docs live in `node_modules/next/dist/docs/`.
5. `docs/spec/` — the contractual spec (Bilag 1–3).
6. `docs/design/DESIGN.md` — colour, type, shell, and per-screen rules. Read it before any component or mockup.

## Topic docs

| Doc | Covers |
|---|---|
| `docs/agents/stack.md` | versions, commands, env vars, Ultracite, Sentry |
| `docs/agents/supabase.md` | declarative schemas, migrations, generated types, RLS, pgTAP, service-role allowlist |
| `docs/agents/auth.md` | username login, admin role in JWT, booker verification, holds |
| `docs/agents/email.md` | `sendMail()`, Resend templates, webhook, the one hourly job |
| `docs/agents/deploy.md` | environments, branches, CI, Netlify |
| `docs/agents/ui.md` | shadcn/Base UI, forms, `messages/da.ts` |
| `docs/agents/testing.md` | what Vitest and pgTAP each own |
| `docs/agents/issue-tracker.md` | GitHub Issues via `gh` |
| `docs/agents/domain.md` | how to consume CONTEXT.md and ADRs |

## Hard rules

- **Money** is integer øre, excl. VAT, everywhere (ADR-0019, ADR-0020). **Time** is `timestamptz` UTC; display in `Europe/Copenhagen` (ADR-0021). **Columns** carry the singular table-name prefix (ADR-0018).
- **Data access**: user session + RLS by default, admins included. The service-role client is allowed only in the five places listed in `docs/agents/supabase.md`.
- **Mutations** are Server Actions validated with zod. The only `route.ts` files are `app/api/webhooks/resend/` and `app/api/jobs/*`.
- **Email** goes through `lib/email/sendMail.ts` (app) or `supabase/functions/send-email` (auth). Nothing else imports Resend. Development redirects all mail to `EMAIL_REDIRECT_TO`.
- **Schema** changes are edits to `supabase/schemas/` + `supabase db diff` + regenerated `lib/supabase/database.types.ts` + a pgTAP test, in one PR. Never `db push` from a laptop; never change anything in the Supabase dashboard.
- **Env** is read only in `lib/env.ts`. Every new variable is added to `.env.example`.
- **Copy**: Danish strings live in `messages/da.ts` (UI) or `emails/templates/` (email); none in components. Code, comments, commits, docs in English.
- **Lint/format**: Ultracite only. No ESLint, no Prettier. `npm run fix` before committing.
- **Output**: user-facing text goes through `unslop` (plain language, ISO 24495-1). Applies to what the agent sends, never to its reasoning.
- **Scheduling**: one Netlify scheduled function → `POST /api/jobs/send-reminders`. No croner, no pg_cron, no Resend `scheduledAt`.
- **Sentry** never receives booker or contact data; correlate on `company_id` and `booking_number`.
- **Layout**: `app/`, `components/`, `lib/`, `emails/`, `messages/`, `scripts/`, `netlify/`, `supabase/`, `docs/` at the root. No `src/`.

## Workflow

Branch from `develop` → PR into `develop` (squash) → release PR `develop` → `main`. Conventional commits. CI must be green: `check`, `tsc`, `vitest`, `supabase test db`, types up to date, `next build`. Agents open PRs; humans merge. Skills in `.agents/skills/`: load `supabase-postgres-best-practices` before SQL, `supabase` before any Supabase work (edge functions, auth hooks, clients), `shadcn` before components, `vercel-react-best-practices` before React, and `tdd` when building a behaviour test-first.

Out of scope until their milestone: Microsoft Graph / Outlook sync, English UI, payments.


# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `npm exec -- ultracite fix`
- **Check for issues**: `npm exec -- ultracite check`
- **Diagnose setup**: `npm exec -- ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `npm exec -- ultracite fix` before committing to ensure compliance.

## Ponytail

Ponytail is active: write only what the task needs; never cut validation, error
handling, security, or accessibility. Ladder: YAGNI → reuse → stdlib → native
→ installed dependency → one line → minimum that works. Claude Code:
`/ponytail [lite|full|ultra|off]`.

