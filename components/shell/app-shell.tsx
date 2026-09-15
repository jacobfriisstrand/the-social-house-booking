"use client";

// The app shell (#55): one shell for members and admins — sidebar with the
// admin group only when the session carries the admin role, the content
// column (mobile menu button, page content, footer line), and the
// off-canvas sheet on phone. Visual rules: docs/design/DESIGN.md, "Shell".
import { CalendarPlusIcon, LogOutIcon, WifiIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
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
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth/actions";
import {
  isShellLinkActive,
  type ShellNavLink,
  shellAdminLinks,
  shellMainLinks,
} from "@/lib/shell/nav";
import { messages } from "@/messages/da";

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

function ShellFooter() {
  return (
    <footer className="flex items-center justify-end gap-2 text-muted-foreground text-xs">
      <span className="inline-flex">
        <WifiIcon aria-hidden="true" className="size-4" />
      </span>
      <span>{messages.shell.footer.network}</span>
      <Separator className="h-3.5 self-center" orientation="vertical" />
      <span>{messages.shell.footer.passwordLabel}</span>
      <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-foreground">
        {messages.shell.footer.password}
      </span>
    </footer>
  );
}

export function AppShell({
  children,
  isAdmin,
  defaultOpen,
}: {
  children: ReactNode;
  isAdmin: boolean;
  defaultOpen: boolean;
}) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <ShellSidebar isAdmin={isAdmin} />
      <SidebarInset>
        <div className="flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-4 md:px-8 md:py-6">
          <SidebarTrigger
            aria-label={messages.shell.openMenu}
            className="self-start md:hidden"
          />
          {children}
          <ShellFooter />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
