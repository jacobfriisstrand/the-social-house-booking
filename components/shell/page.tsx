// Page header and content panel (docs/design/DESIGN.md, "Shell"): the shell
// renders the sidebar and the footer line; each page renders its title with
// at most one action, and its content on the muted panel.
import type { ReactNode } from "react";

export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 bg-background py-1">
      <h1 className="font-semibold text-lg md:text-xl">{title}</h1>
      {children}
    </div>
  );
}

export function PagePanel({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto rounded-xl border bg-muted p-6">
      {children}
    </div>
  );
}
