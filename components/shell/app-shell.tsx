"use client";

// The app shell (#55): one shell for members and admins — sidebar with the
// admin group only when the session carries the admin role, the content
// column (mobile menu button, page content, footer line), and the
// off-canvas sheet on phone. Visual rules: docs/design/DESIGN.md, "Shell".
import {
  CalendarPlusIcon,
  CopyIcon,
  LogOutIcon,
  SettingsIcon,
  WifiIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { SearchDialog } from "@/components/bookings/search-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { signOut } from "@/lib/auth/actions";
import type { WifiSettings } from "@/lib/settings/data";
import {
  isShellLinkActive,
  type ShellNavLink,
  shellAdminLinks,
  shellMainLinks,
} from "@/lib/shell/nav";
import { messages } from "@/messages/da";

// On phone the sidebar is an off-canvas sheet; a route change must dismiss
// it (picking a nav item on mobile should land on the page, not stay in the
// open menu). The pathname watches the location, so programmatic navigation
// closes it too, not just link clicks.
function CloseMobileSidebarOnNavigate() {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();

  // The dependency is the point: re-run whenever the location changes, even
  // though the body does not read the path.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional route-change effect.
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return null;
}

// Every shell link is a gated dynamic route: prefetching them all on render
// makes each page load SSR the whole sidebar server-side (six extra renders
// right after login, on routes the user has not clicked). They fetch on
// click instead.
// Count badges are the shared Badge (DESIGN.md "Badges"): the member's
// list counts sit on the muted outline chip, the admin worklist wears the
// warning tint. Zero counts hide the badge entirely.
const badgeByTone = {
  neutral: {
    className: "justify-center bg-muted px-1.5 tabular-nums",
    variant: "outline",
  },
  warning: { variant: "warning" },
} as const;

function ShellNavLinkItem({
  badge,
  link,
}: {
  badge?: number;
  link: ShellNavLink;
}) {
  const pathname = usePathname();
  const Icon = link.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="text-muted-foreground [&_svg]:size-5"
        isActive={isShellLinkActive(link.href, pathname)}
        render={<Link href={link.href} prefetch={false} />}
        tooltip={link.label}
      >
        <Icon />
        {/* Hidden on the icon rail: the collapsed button centers the icon. */}
        <span className="group-data-[collapsible=icon]:hidden">
          {link.label}
        </span>
      </SidebarMenuButton>
      {/* Zero counts hide the badge: an empty worklist says nothing. */}
      {badge ? (
        <SidebarMenuBadge {...badgeByTone[link.badgeTone ?? "neutral"]}>
          {badge}
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
}

// "Book lokale" as a text button, and as an icon button on the collapsed
// rail with the same height so collapsing does not shift the nav. On
// phone the sidebar is a sheet: it closes as the dialog opens.
function BookRoomButtons({ onOpen }: { onOpen: () => void }) {
  const { setOpenMobile } = useSidebar();
  const handleClick = useCallback(() => {
    setOpenMobile(false);
    onOpen();
  }, [onOpen, setOpenMobile]);
  return (
    <>
      <Button
        className="w-full group-data-[collapsible=icon]:hidden"
        onClick={handleClick}
        size="lg"
      >
        {messages.shell.bookRoom}
      </Button>
      <Button
        aria-label={messages.shell.bookRoom}
        className="mx-auto hidden size-9 group-data-[collapsible=icon]:flex"
        onClick={handleClick}
        size="icon"
      >
        <CalendarPlusIcon />
      </Button>
    </>
  );
}

function ShellSidebar({
  badgeCounts,
  isAdmin,
  onOpenSearch,
}: {
  badgeCounts?: Record<string, number>;
  isAdmin: boolean;
  onOpenSearch: () => void;
}) {
  const pathname = usePathname();
  const badgeFor = (href: string): number | undefined => badgeCounts?.[href];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* The house mark always, and the brand as text beside it only
            when expanded — the mark alone on the icon rail (changed
            2026-10-01); on the phone sheet the sidebar carries no
            data-collapsible, so the text shows there too. The row is as
            tall as the page header row, so the logo sits on the same
            centre line as the page title beside it. The sidebar toggle
            lives outside the sidebar, on the page title row — it must
            stay reachable with the sidebar collapsed or expanded. The
            text is aria-hidden: the image's alt names the brand, so
            screen readers hear it once in both modes. */}
        <div className="flex h-9 items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Image
            alt="The Social House"
            height={28}
            priority
            src="/logo-mark.svg"
            unoptimized
            width={28}
          />
          <span
            aria-hidden="true"
            className="font-semibold text-xl group-data-[collapsible=icon]:hidden"
          >
            {messages.shell.brand}
          </span>
        </div>
      </SidebarHeader>
      <SidebarGroup>
        <SidebarGroupContent>
          <BookRoomButtons onOpen={onOpenSearch} />
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {shellMainLinks(isAdmin).map((link) => (
                <ShellNavLinkItem
                  badge={badgeFor(link.href)}
                  key={link.href}
                  link={link}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase tracking-wider">
              {messages.shell.adminGroup}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {shellAdminLinks().map((link) => (
                  <ShellNavLinkItem
                    badge={badgeFor(link.href)}
                    key={link.href}
                    link={link}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="gap-1">
          {isAdmin ? null : (
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-muted-foreground [&_svg]:size-5"
                isActive={isShellLinkActive("/settings", pathname)}
                render={<Link href="/settings" prefetch={false} />}
                tooltip={messages.shell.settings}
              >
                <SettingsIcon />
                <span className="group-data-[collapsible=icon]:hidden">
                  {messages.shell.settings}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <form action={signOut}>
              <SidebarMenuButton
                className="text-muted-foreground [&_svg]:size-5"
                tooltip={messages.common.signOut}
                type="submit"
              >
                <LogOutIcon />
                <span className="group-data-[collapsible=icon]:hidden">
                  {messages.common.signOut}
                </span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function ShellFooter({ wifi }: { wifi: WifiSettings }) {
  const [copying, setCopying] = useState(false);

  const handleCopy = useCallback(async (): Promise<void> => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(wifi.password);
      toast.add({ title: messages.settings.passwordCopied, type: "success" });
    } finally {
      setCopying(false);
    }
  }, [wifi.password]);

  const copyButton = (
    <Button
      aria-label={messages.settings.copyPassword}
      disabled={copying}
      onClick={handleCopy}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <CopyIcon />
    </Button>
  );

  return (
    <footer className="flex flex-wrap items-center justify-center gap-2 text-muted-foreground text-xs md:justify-end">
      <span className="inline-flex">
        <WifiIcon aria-hidden="true" className="size-4" />
      </span>
      <span>{wifi.network}</span>
      <Separator className="my-auto h-3.5 self-center" orientation="vertical" />
      <span>{messages.shell.footer.passwordLabel}</span>
      <span className="inline-flex items-center gap-1">
        <span className="font-mono text-foreground">{wifi.password}</span>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            {copyButton}
          </TooltipTrigger>
          <TooltipContent>{messages.settings.copyPassword}</TooltipContent>
        </Tooltip>
      </span>
    </footer>
  );
}

export function AppShell({
  badgeCounts,
  children,
  isAdmin,
  defaultOpen,
  wifi,
}: {
  badgeCounts?: Record<string, number>;
  children: ReactNode;
  isAdmin: boolean;
  defaultOpen: boolean;
  wifi: WifiSettings;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <CloseMobileSidebarOnNavigate />
      <ShellSidebar
        badgeCounts={badgeCounts}
        isAdmin={isAdmin}
        onOpenSearch={openSearch}
      />
      <SearchDialog onOpenChange={setSearchOpen} open={searchOpen} />
      {/* min-w-0: the inset is a flex item next to the sidebar, and a page
          whose content has a minimum width (a wide table) must not widen
          it past the viewport; the content scrolls inside instead. */}
      <SidebarInset className="min-w-0">
        {/* From tablet up the column is exactly the viewport: title, panel
            and footer line stay in view and the panel scrolls inside
            (DESIGN.md "Shell"). Phone keeps the document scroll. No left
            padding from tablet up: the sidebar's own padding is the gutter,
            so the menu sits centred between the screen edge and the
            content. */}
        <div className="flex w-full max-w-[1800px] flex-1 flex-col gap-3 px-2 py-2 md:h-svh md:flex-none md:overflow-hidden md:py-2 md:pr-2 md:pl-0">
          {children}
          <ShellFooter wifi={wifi} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
