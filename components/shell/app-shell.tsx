"use client";

// The app shell (#55): one shell for members and admins — sidebar with the
// admin group only when the session carries the admin role, the content
// column (mobile menu button, page content, footer line), and the
// off-canvas sheet on phone. Visual rules: docs/design/DESIGN.md, "Shell".
import { CalendarPlusIcon, CopyIcon, LogOutIcon, WifiIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
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

function ShellNavLinkItem({ link }: { link: ShellNavLink }) {
  const pathname = usePathname();
  const Icon = link.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="text-muted-foreground [&_svg]:size-5"
        isActive={isShellLinkActive(link.href, pathname)}
        render={<Link href={link.href} />}
        tooltip={link.label}
      >
        <Icon />
        {/* Hidden on the icon rail: the collapsed button centers the icon. */}
        <span className="group-data-[collapsible=icon]:hidden">
          {link.label}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function ShellSidebar({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* Fixed height: collapsing hides the logo, and the row must not
            shrink or the whole nav shifts up. */}
        <div className="flex h-9 items-center justify-between group-data-[collapsible=icon]:justify-center">
          <Image
            alt="The Social House"
            className="group-data-[collapsible=icon]:hidden"
            height={30}
            priority
            src="/logo.svg"
            unoptimized
            width={130}
          />
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarGroup>
        <SidebarGroupContent>
          {/* Wired to the search dialog by #4; renders disabled until then. */}
          <Button
            aria-disabled="true"
            className="w-full group-data-[collapsible=icon]:hidden"
            disabled
            size="lg"
          >
            {messages.shell.bookRoom}
          </Button>
          {/* Same height as the text button so collapsing does not shift
              the nav. */}
          <Button
            aria-disabled="true"
            aria-label={messages.shell.bookRoom}
            className="mx-auto hidden size-9 group-data-[collapsible=icon]:flex"
            disabled
            size="icon"
          >
            <CalendarPlusIcon />
          </Button>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {shellMainLinks(isAdmin).map((link) => (
                <ShellNavLinkItem key={link.href} link={link} />
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
                  <ShellNavLinkItem key={link.href} link={link} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="gap-1">
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
    <footer className="flex justify-end gap-2 text-muted-foreground text-xs max-md:flex-col md:items-center md:gap-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex">
          <WifiIcon aria-hidden="true" className="size-4" />
        </span>
        <span>{wifi.network}</span>
      </div>
      <Separator
        className="my-auto h-3.5 self-center max-md:hidden"
        orientation="vertical"
      />
      <div className="flex items-center gap-2">
        <span>{messages.shell.footer.passwordLabel}</span>
        <span className="inline-flex items-center gap-1">
          <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-foreground">
            {wifi.password}
          </span>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              {copyButton}
            </TooltipTrigger>
            <TooltipContent>{messages.settings.copyPassword}</TooltipContent>
          </Tooltip>
        </span>
      </div>
    </footer>
  );
}

export function AppShell({
  children,
  isAdmin,
  defaultOpen,
  wifi,
}: {
  children: ReactNode;
  isAdmin: boolean;
  defaultOpen: boolean;
  wifi: WifiSettings;
}) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <CloseMobileSidebarOnNavigate />
      <ShellSidebar isAdmin={isAdmin} />
      <SidebarInset>
        <div className="flex w-full max-w-[1800px] flex-1 flex-col gap-6 px-4 py-4 md:px-8 md:py-6">
          <SidebarTrigger
            aria-label={messages.shell.openMenu}
            className="self-start md:hidden"
          />
          {children}
          <ShellFooter wifi={wifi} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
