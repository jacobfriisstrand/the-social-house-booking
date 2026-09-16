// Page header and content panel (docs/design/DESIGN.md, "Shell"): the shell
// renders the sidebar and the footer line; each page renders its title with
// at most one action, and its content on the muted panel. On phone the
// menu button sits on the title row.
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
          className="md:hidden"
        />
        <h1 className="font-semibold text-xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function PagePanel({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-6 rounded-xl bg-muted p-3">
      {children}
    </div>
  );
}
