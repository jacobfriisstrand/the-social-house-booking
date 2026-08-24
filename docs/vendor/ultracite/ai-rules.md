Source: https://www.ultracite.ai/docs/ai/rules (plus https://www.ultracite.ai/docs/ai/hooks and https://www.ultracite.ai/docs/ai/skills)
Fetched: 2026-08-24

# Agent Rules

Source: https://www.ultracite.ai/docs/ai/rules

_Generate editor rule files for Cursor, Claude Code, and other AI tools so code suggestions start closer to your repo standards._

Ultracite provides seamless integration with AI coding assistants by automatically generating editor-specific rule files. These rules help guide AI assistants to write better, more consistent code that follows best practices.

The editor rules work alongside your linter's formatting and linting. While your linter handles code formatting and catches errors, the editor rules guide AI assistants to write better code from the start, reducing the need for fixes later.

The generated rules intentionally focus on code quality and implementation guidance instead of hardcoding formatter-specific settings like line width, quote style, or trailing commas. That keeps the rules portable across repositories while still letting each project's configured formatter stay in charge.

This dual approach ensures both automated code quality (through linting) and intelligent code generation (through AI coding rules).

## Setup

### Automatic Setup

When you run `npx ultracite init`, you'll be prompted to select which agent files you want to add:

```bash
  ◯ Universal (creates AGENTS.md for Codex, Jules, Devin, and more)
  ◯ Claude (creates .claude/CLAUDE.md)
  ◯ Replit (creates replit.md)
  # ... and more
```

This will create the relevant rule file(s) in your project directory.

### Manual Setup

If you want to manually set things up, create the relevant file in your project directory. You can find the rule file location for each agent on their respective pages. Then, copy and paste [this content](https://github.com/haydenbleasel/ultracite/blob/main/packages/cli/src/data/rules.ts) into the file.

## Supported Agents

Ultracite supports a wide range of AI coding assistants. Check the **Agents** section in the navigation bar for the full list of supported agents, including setup instructions and configuration details for each one.

## Reusable Skills

If your AI tool supports installable reusable skills, see the [Agent Skills](https://www.ultracite.ai/docs/ai/skills) guide. The global Ultracite skill gives you the same baseline guidance across repositories while leaving formatting decisions to each repo's configured linter and formatter.

## Benefits

Using Ultracite editor rules provides several advantages:

- **Consistency**: All AI-generated code follows the same conventions
- **Quality**: Rules enforce best practices and prevent common mistakes
- **Accessibility**: Built-in accessibility guidelines ensure inclusive code
- **Performance**: Rules promote efficient patterns and avoid anti-patterns
- **Security**: Guidelines help prevent common security vulnerabilities

## Customization

While the default rules are comprehensive, you can customize them for your specific needs:

1. **Modify existing rules**: Edit the rule files directly
2. **Add project-specific rules**: Append additional guidelines
3. **Disable rules**: Remove or comment out rules that don't apply to your project

---

# Agent Hooks

Source: https://www.ultracite.ai/docs/ai/hooks

_Run Ultracite after AI-assisted file edits with editor hooks so formatting and safe fixes happen automatically before review._

Ultracite can automatically format and fix code after AI coding assistants make edits through hooks. This ensures all AI-generated code adheres to your project's standards without manual intervention.

The hooks work alongside your linter's formatting. After an AI coding assistant edits a file, the hook automatically runs your project's `fix` script (which runs `ultracite fix`) to format and fix auto-fixable linting issues. This dual approach ensures both intelligent code generation (through AI rules) and automated code quality (through hooks).

> **Note:** Hooks are separate from AI coding rules. The `--agents` flag configures AI coding rules, while the `--hooks` flag sets up automatic formatting after file edits.

## Setup

Some tools like Cursor, Windsurf, CodeBuddy, Claude Code, and GitHub Copilot support hooks that run after AI agents edit files. Ultracite can configure these hooks automatically.

### Automatic Setup

When you run `npx ultracite init`, you'll be prompted to select which editor hooks you want to enable:

```bash
  ◯ Cursor
  ◯ Windsurf
  ◯ CodeBuddy
  ◯ Claude Code
  ◯ GitHub Copilot
```

This will create the relevant hook configuration file in your project directory.

Ultracite writes the following files:

- Cursor: `.cursor/hooks.json`
- Windsurf: `.windsurf/hooks.json`
- CodeBuddy: `.codebuddy/settings.json`
- Claude Code: `.claude/settings.json`
- GitHub Copilot: `.github/hooks/ultracite.json`

### Manual Setup

If you want to manually set things up or add hooks after initialization, run:

```bash
```

Alternatively, you can manually create or edit the hook configuration files in your project directory and add the appropriate hook command.

## How It Works

1. **Automatic Execution**: After the AI agent edits a file, the hook automatically runs your project's `fix` script (added to `package.json` during init). On Biome projects, the hook passes `--skip=correctness/noUnusedImports` to avoid removing imports mid-edit.
2. **Code Formatting**: Ultracite formats the edited code according to your linter configuration
3. **Linting Fixes**: Auto-fixable linting issues are resolved automatically
4. **Seamless Integration**: The process happens transparently without interrupting your workflow

## Benefits

Using Ultracite editor hooks provides several advantages:

- **Consistency**: All AI-generated code is automatically formatted to match your style
- **Quality**: Linting issues are fixed immediately after code generation
- **Efficiency**: No need to manually run formatters or linters after AI edits
- **Standards**: Ensures AI-generated code always adheres to project standards
- **Clean Commits**: Code is properly formatted before you even review it

## Customization

Ultracite intelligently merges with existing hook configurations:

- **Preserves existing hooks**: All existing hooks and their commands remain intact
- **Avoids duplicates**: If Ultracite is already configured, it won't be added again
- **Non-destructive**: Your existing hook configuration structure is maintained

You can also customize the hook behavior by modifying the hook configuration files directly if you need different formatting commands or additional post-edit actions.

---

# Agent Skills

Source: https://www.ultracite.ai/docs/ai/skills

_Install the Ultracite skill for tools that support reusable skills, and keep repo-specific formatting decisions local to each project._

Ultracite supports two different AI guidance layers:

1. Repo-local agent rules generated by `npx ultracite init --agents ...`
2. A reusable Ultracite skill you can install once and carry across repositories

Use the global skill when your AI tool understands `SKILL.md`-style skills and you want a shared Ultracite baseline without copying the same instructions into every repo by hand.

## Install the skill

If you already run `npx ultracite init`, the interactive setup can offer to install the skill for you. For non-interactive flows, you can also pass:

```bash
```

If your AI tool supports installable skills, you can always add Ultracite directly with:

```bash
```

This installs the reusable skill bundle from the repository so compatible tools can load it as a shared capability.

## What the skill includes

The installable skill ships with:

- `skills/ultracite/SKILL.md` for the main workflow and guidance
- `skills/ultracite/references/code-standards.md` for the detailed standards reference

The skill is designed to help an agent:

- detect when Ultracite is present in a project
- choose the active linter stack
- use the right `ultracite check`, `fix`, and `doctor` commands
- follow Ultracite's code quality, accessibility, performance, and testing standards

## Formatting stays project-local

The global skill intentionally does not hardcode formatter-specific settings such as line width, quote style, semicolons, or trailing commas.

Those details should come from the repository's configured linter and formatter instead:

- Biome projects should follow `biome.jsonc`
- ESLint projects should follow ESLint plus Prettier and Stylelint
- Oxlint projects should follow Oxlint plus Oxfmt

That keeps one global skill portable across multiple repositories without forcing every repo to share the same formatting choices.

## How it fits with repo instructions

The global skill is a baseline, not a replacement for repo-specific instructions.

Use repo-local files such as `AGENTS.md`, `CLAUDE.md`, `replit.md`, or other agent-specific config when you need to add:

- architecture decisions for a single codebase
- framework or deployment details
- project-specific naming or file layout rules
- workflow notes that only apply to one repository

In practice, the best setup is usually:

1. Install the global Ultracite skill once
2. Add repo-local Ultracite agent rules where your tool supports them
3. Let the repository's formatter config control formatting details

## When to use which option

Choose repo-local agent rules when you want committed instructions inside a specific repository and need every collaborator or cloud task to inherit the same contract.

Choose the global skill when you want Ultracite available everywhere by default and prefer to keep formatting and project specifics in each repository's own configuration.

---

# Appendix: rule/hook file paths per agent (from source)

Source: https://github.com/haydenbleasel/ultracite/blob/main/packages/cli/src/data/agents.ts and `packages/cli/src/data/editors.ts` (ultracite 7.10.6)

The "Agents" section pages referenced above were not present in the public docs nav, so the exact paths were taken from the CLI source. `--agents universal` writes `AGENTS.md`; `--editors universal` writes `.vscode/settings.json`. Files marked "append" are appended to if they already exist.

| Agent id | Name | Rules file (write mode) | Hook file |
| --- | --- | --- | --- |
| universal | Universal | `AGENTS.md` (append) | — |
| claude | Claude Code | `.claude/CLAUDE.md` (append) | `.claude/settings.json` (PostToolUse, matcher `Write\|Edit`) |
| copilot | GitHub Copilot | `AGENTS.md` | `.github/hooks/ultracite.json` |
| codex, jules, devin, lovable, zencoder, ona, openclaw, continue, snowflake-cortex, deepagents, qoder, kimi-cli, mcpjam, mux, pi, adal, cline, amp, firebase-studio, open-hands, junie, augmentcode, bob, kilo-code, goose, warp, droid, opencode, crush, qwen, cursor-cli, mistral-vibe, vercel | (various) | `AGENTS.md` | — |
| replit | Replit Agent | `replit.md` | — |
| aider | Aider | `ultracite.md` | — |
| gemini | Gemini | `GEMINI.md` | — |
| roo-code | Roo Code | `.roo/rules/ultracite.md` | — |
| amazon-q-cli | Amazon Q CLI | `.amazonq/rules/ultracite.md` | — |
| firebender | Firebender | `firebender.json` | — |

Editor hook files (`--hooks`): Cursor `.cursor/hooks.json`, Windsurf `.windsurf/hooks.json`, CodeBuddy `.codebuddy/settings.json`, Claude Code `.claude/settings.json`, GitHub Copilot `.github/hooks/ultracite.json`. Editor settings (`--editors`): all VS Code-based editors write `.vscode/settings.json`; Zed writes `.zed/settings.json`. No `.cursor/rules/*.mdc` and no `.github/copilot-instructions.md` are generated in this version.
