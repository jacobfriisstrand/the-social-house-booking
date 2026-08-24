Source: https://ui.shadcn.com/docs/installation/next
Fetched: 2026-08-24

---

# Next.js

Install and configure shadcn/ui for Next.js.

Choose the setup that matches your starting point.

## Use shadcn/create

### Build Your Preset

Open [shadcn/create](https://ui.shadcn.com/create?template=next) and build your preset visually. Choose your style, colors, fonts, icons, and more.

### Create Project

Click `Create Project`, choose your package manager, and copy the generated command.

The generated command will look similar to this:

```bash
pnpm dlx shadcn@latest init --preset [CODE] --template next
```

The exact command will include your selected options such as `--base`, `--monorepo`, or `--rtl`.

### Add Components

Add the `Card` component to your project:

```bash
pnpm dlx shadcn@latest add card
```

If you created a monorepo, run the command from `apps/web` or specify the workspace from the repo root:

```bash
pnpm dlx shadcn@latest add card -c apps/web
```

The command above will add the `Card` component to your project. You can then import it like this:

```tsx
// app/page.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Home() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Project Overview</CardTitle>
        <CardDescription>
          Track progress and recent activity for your Next.js app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        Your design system is ready. Start building your next component.
      </CardContent>
    </Card>
  )
}
```

If you created a monorepo, update `apps/web/app/page.tsx` and import from `@workspace/ui/components/card` instead.

## Use the CLI

### Create Project

Run the `init` command to scaffold a new Next.js project. Follow the prompts to configure your project: base, preset, monorepo, and more.

```bash
pnpm dlx shadcn@latest init -t next
```

**For a monorepo project, use `--monorepo` flag:**

```bash
pnpm dlx shadcn@latest init -t next --monorepo
```

### Add Components

Add the `Card` component to your project:

```bash
pnpm dlx shadcn@latest add card
```

If you created a monorepo, run the command from `apps/web` or specify the workspace from the repo root:

```bash
pnpm dlx shadcn@latest add card -c apps/web
```

The command above will add the `Card` component to your project. You can then import it like this:

```tsx
// app/page.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Home() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Project Overview</CardTitle>
        <CardDescription>
          Track progress and recent activity for your Next.js app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        Your design system is ready. Start building your next component.
      </CardContent>
    </Card>
  )
}
```

If you created a monorepo, update `apps/web/app/page.tsx` and import from `@workspace/ui/components/card` instead.

## Existing Project

### Create Project

If you need a new Next.js project, create one with `create-next-app`. Otherwise, skip this step.

```bash
pnpm create next-app@latest
```

Choose the recommended defaults so Tailwind CSS, the App Router, and the default `@/*` import alias are configured for you.

If you prefer a `src/` directory, use `--src-dir` or choose `Yes` when prompted:

```bash
pnpm create next-app@latest --src-dir
```

With `--src-dir`, Next.js places your app in `src/app` and configures the `@/*` alias to point to `./src/*`.

### Configure Tailwind CSS and Import Aliases

If you created your project with the recommended `create-next-app` defaults, you can skip this step.

If you're adding shadcn/ui to an older or custom Next.js app, make sure Tailwind CSS is installed first. You can follow the official [Next.js installation guide](https://nextjs.org/docs/app/getting-started).

Then make sure your `tsconfig.json` includes the `@/*` import alias:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

If you used `--src-dir`, point the alias to `./src/*` instead.

### Run the CLI

Run the `shadcn` init command to set up shadcn/ui in your project.

```bash
pnpm dlx shadcn@latest init
```

### Add Components

You can now start adding components to your project.

```bash
pnpm dlx shadcn@latest add button
```

The command above will add the `Button` component to your project. You can then import it like this:

```tsx
// app/page.tsx
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Button>Click me</Button>
    </div>
  )
}
```

If you used `--src-dir`, add the component to `src/app/page.tsx` instead.

---

## Supplementary: `shadcn init` CLI options

Source: https://ui.shadcn.com/docs/cli (fetched 2026-08-24, appended for reference)

```
Usage: shadcn init [options] [components...]
  initialize your project and install dependencies

Arguments:
  components                 names, url or local path to component

Options:
  -t, --template <template>  the template to use. (next, vite, start, react-router, laravel, astro)
  -b, --base <base>          the component library to use. (base, radix, aria)
  -p, --preset [name]        use a preset configuration
  -y, --yes                  skip confirmation prompt. (default: true)
  -d, --defaults             use default configuration: --template=next --preset=nova (default: false)
  -f, --force                force overwrite of existing configuration. (default: false)
  -c, --cwd <cwd>            the working directory. defaults to the current directory.
  -n, --name <name>          the name for the new project.
  -s, --silent               mute output. (default: false)
  --css-variables            use css variables for theming. (default: true)
  --no-css-variables         do not use css variables for theming.
  --monorepo                 scaffold a monorepo project.
  --no-monorepo              skip the monorepo prompt.
  --rtl                      enable RTL support.
  --no-rtl                   disable RTL support.
  --pointer                  enable pointer cursor for buttons.
  --no-pointer               disable pointer cursor for buttons.
  --reinstall                re-install existing UI components.
  --no-reinstall             do not re-install existing UI components.
  -h, --help                 display help for command
```
