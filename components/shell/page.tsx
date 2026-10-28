// Page header and content panel (docs/design/DESIGN.md, "Shell"): the shell
// renders the sidebar and the footer line; each page renders its title, its
// actions right-aligned at the panel's top (2026-10-28, moved out of the
// header row when the signed-in chip took the row's far end), and its
// content on the muted panel. The sidebar toggle sits here, outside the
// sidebar and always visible — collapsed or expanded (2026-09-29) — its
// glyph flush with the column's left edge (the icon's own viewBox inset is
// what the small negative margin cancels), so it lines up with whatever
// sits under the title.
import type { ReactNode } from "react";
import { SignedInAs } from "@/components/shell/identity";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { messages } from "@/messages/da";

function SidebarToggle() {
  return (
    <SidebarTrigger
      aria-label={messages.shell.toggleSidebar}
      className="justify-center px-0 hover:bg-transparent active:translate-y-0 [&_svg]:size-6"
      size="icon-lg"
    />
  );
}

export function PageHeader({
  meta,
  title,
}: {
  title: string;
  // A muted fact beside the title — the overview's date window, say. The
  // row carries no actions: they sit at the panel's top, right-aligned
  // (2026-10-28), leaving the chip the row's very far right.
  meta?: ReactNode;
}) {
  return (
    // min-h-9: the row is as tall as the sidebar's header row, so the page
    // title and the house mark beside it share one centre line (2026-09-29).
    <div className="flex min-h-9 flex-wrap items-center justify-between gap-4">
      <div className="flex items-baseline gap-1">
        <SidebarToggle />
        <h1 className="font-semibold text-xl">{title}</h1>
        {meta ? (
          <span className="ml-2 text-muted-foreground text-sm">{meta}</span>
        ) : null}
      </div>
      <SignedInAs />
    </div>
  );
}

export function PagePanel({
  actions,
  children,
}: {
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-xl border bg-muted p-3 shadow-xs md:min-h-0 md:overflow-y-auto">
      {/* The page's actions, moved out of the header row (2026-10-28):
          right-aligned above the cards. shrink-0: the panel is a
          fixed-height scrolling column and would squash the row to fit
          (the terms page's card carries the same note). */}
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}
      {children}
    </div>
  );
}

// What a page shows while its server data loads (each shell group's
// loading.tsx): the header row keeps the sidebar toggle so nothing jumps,
// the title arrives with the page, and the spinner sits in the panel.
export function PageLoading() {
  return (
    <>
      <div className="flex min-h-9 items-center">
        <SidebarToggle />
      </div>
      <PagePanel>
        <div className="flex flex-1 items-center justify-center">
          <Spinner
            aria-label={messages.common.loading}
            className="size-6 text-muted-foreground"
          />
        </div>
      </PagePanel>
    </>
  );
}
