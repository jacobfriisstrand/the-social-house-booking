Source: https://www.ultracite.ai/docs
Fetched: 2026-08-24

# Introduction

_Learn what Ultracite is, which linting toolchains it supports, and how its zero-config presets help teams and AI write cleaner code._

Ultracite is a highly opinionated, zero-configuration preset for JavaScript and TypeScript linting and formatting. It supports three major toolchains:

- **[Biome](https://biomejs.dev/)** — The modern, all-in-one toolchain written in Rust
- **[ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) + [Stylelint](https://stylelint.io/)** — The most mature and comprehensive linting ecosystem
- **[Oxlint](https://oxc.rs/docs/guide/usage/linter.html) + [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html)** — The fastest linter available, 50-100x faster than ESLint

Install Ultracite quickly by running:

```bash
```

Then follow the [Usage](https://www.ultracite.ai/docs/usage) guide to get started, or check out [Setup](https://www.ultracite.ai/docs/setup) for more granular control.

Coming from an existing setup? There are step-by-step guides for migrating from [ESLint](https://www.ultracite.ai/docs/migrate/eslint), [Prettier](https://www.ultracite.ai/docs/migrate/prettier), [Stylelint](https://www.ultracite.ai/docs/migrate/stylelint), [Biome](https://www.ultracite.ai/docs/migrate/biome), and [Oxlint](https://www.ultracite.ai/docs/migrate/oxlint).

## How does Ultracite work?

Once set up, Ultracite runs mostly in the background — automatically formatting your code and applying fixes every time you save your files. Because the underlying tools are highly optimized (especially the Rust-based Biome and Oxlint), running Ultracite's checks is extremely fast and can comfortably run on every save without lag. This means you can focus on building and shipping instead of manually correcting style issues or debugging runtime errors.

## Goals

Ultracite's goals from a development perspective are:

### Lightning-fast performance

Ultracite benefits from the performance of Rust-based tools like [Biome](https://biomejs.dev/) and [Oxlint](https://oxc.rs/), enabling instant feedback even on large codebases.

### Zero-config by design

Ultracite is designed to be zero-config by default. This allows new users to get started quickly without needing to configure their linter or formatter, saving teams time when onboarding new developers.

The goal is to provide a default configuration that works for most projects, while still allowing customization for those who need it.

### Intuitive and simple

Ultracite should be as invisible as possible. Preferably, it should not require any configuration or action from the user. When feedback is needed, it should be easy to understand and act on.

### Maximum type safety

Ultracite is designed to be as type-safe as possible. It uses TypeScript's strict mode and additional lint rules to catch errors and provide suggestions for improvements.

### Plays nice with others

Ultracite works alongside other tools and libraries without conflict. You can choose the toolchain that best fits your project's needs.

## Next steps

- Run checks from the command line and your editor with the [Usage](https://www.ultracite.ai/docs/usage) guide.
- Enforce clean commits with [Git hooks](https://www.ultracite.ai/docs/git-hooks), or set Ultracite up across a [monorepo](https://www.ultracite.ai/docs/monorepos).
- Wire up your AI tooling with editor [rules](https://www.ultracite.ai/docs/ai/rules), [hooks](https://www.ultracite.ai/docs/ai/hooks), and [skills](https://www.ultracite.ai/docs/ai/skills).
- Upgrading from an older major? Follow the guides for [v5](https://www.ultracite.ai/docs/upgrade/v5), [v6](https://www.ultracite.ai/docs/upgrade/v6), and [v7](https://www.ultracite.ai/docs/upgrade/v7).
- Stuck on something? Check the [FAQ](https://www.ultracite.ai/docs/faq) and [Troubleshooting](https://www.ultracite.ai/docs/troubleshooting) pages.
- Keep up with new releases on the [changelog](https://www.ultracite.ai/changelog).
