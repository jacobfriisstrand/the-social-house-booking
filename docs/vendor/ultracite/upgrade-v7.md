Source: https://www.ultracite.ai/docs/upgrade/v7
Fetched: 2026-08-24

# Upgrade to v7

_Upgrade from Ultracite v6 to v7 to adopt multi-linter support, updated presets, and the latest generated config structure._

Ultracite v7 introduces support for multiple linting providers: Biome, ESLint + Prettier + Stylelint, and Oxlint + Oxfmt.

## What Changed

### Multi-Provider Support

Ultracite now supports three linting toolchains:

- **[Biome](https://www.ultracite.ai/docs/provider/biome)** — The modern, all-in-one toolchain (default)
- **[ESLint + Prettier + Stylelint](https://www.ultracite.ai/docs/provider/eslint)** — The most mature ecosystem
- **[Oxlint + Oxfmt](https://www.ultracite.ai/docs/provider/oxlint)** — The fastest option

### Updated Preset Paths

Preset paths now include the provider name to distinguish between linters:

| v6 Path             | v7 Path                   |
| ------------------- | ------------------------- |
| `ultracite/core`    | `ultracite/biome/core`    |
| `ultracite/react`   | `ultracite/biome/react`   |
| `ultracite/next`    | `ultracite/biome/next`    |
| `ultracite/solid`   | `ultracite/biome/solid`   |
| `ultracite/vue`     | `ultracite/biome/vue`     |
| `ultracite/svelte`  | `ultracite/biome/svelte`  |
| `ultracite/qwik`    | `ultracite/biome/qwik`    |
| `ultracite/angular` | `ultracite/biome/angular` |
| `ultracite/remix`   | `ultracite/biome/remix`   |
| `ultracite/astro`   | `ultracite/biome/astro`   |

### New CLI Flag

The `--linter` flag allows you to specify which provider to use:

```bash
npx ultracite init --linter eslint
npx ultracite init --linter oxlint
```

## Migration

### For Biome Users (Default)

Update your `biome.jsonc` to use the new preset paths:

```jsonc
{
  // Before (v6)
  "extends": ["ultracite/core", "ultracite/react", "ultracite/next"]

  // After (v7)
  "extends": ["ultracite/biome/core", "ultracite/biome/react", "ultracite/biome/next"]
}
```

### Switching to ESLint

If you'd like to switch to ESLint + Prettier + Stylelint:

```bash
```

This will create `eslint.config.mjs`, `prettier.config.mjs`, and `stylelint.config.mjs` files:

```javascript
import core from "ultracite/eslint/core";
import react from "ultracite/eslint/react";
import next from "ultracite/eslint/next";

export default [...core, ...react, ...next];
```

### Switching to Oxlint

If you'd like to switch to the fastest option:

```bash
```

This will create `oxlint.config.ts` and `oxfmt.config.ts` files:

```ts
import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react, next],
  ignorePatterns: core.ignorePatterns,
});
```

```ts
import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
});
```

## Quick Upgrade

For the fastest upgrade path, run:

```bash
```

When prompted, select your preferred linting provider. Ultracite will update your configuration files automatically.
