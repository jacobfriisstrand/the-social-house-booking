// Page header and content panel (docs/design/DESIGN.md, "Shell"): the shell
// renders the sidebar and the footer line; each page renders its title with
// at most one action, and its content on the muted panel. On phone the
// menu button sits on the title row, its glyph flush with the column's left
// edge (the icon's own viewBox inset is what the small negative margin
// cancels), so it lines up with whatever sits under the title.
import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { messages } from "@/messages/da";

export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger
          aria-label={messages.shell.openMenu}
          className="-ml-0.5 justify-start px-0 hover:bg-transparent active:translate-y-0 md:hidden [&_svg]:size-6"
          size="icon-lg"
        />
        <h1 className="font-semibold text-xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function PagePanel({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-6 rounded-xl bg-muted p-3 md:min-h-0 md:overflow-y-auto">
      {children}
    </div>
  );
}
