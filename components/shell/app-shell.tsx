"use client";

// The app shell (#55): one shell for members and admins — sidebar with the
// admin group only when the session carries the admin role, the content
// column (mobile menu button, page content, footer line), and the
// off-canvas sheet on phone. Visual rules: docs/design/DESIGN.md, "Shell".
import { CalendarPlusIcon, LogOutIcon, WifiIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useState } from "react";
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth/actions";
import type { WifiSettings } from "@/lib/settings/data";
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
  isAdmin,
  onOpenSearch,
}: {
  isAdmin: boolean;
  onOpenSearch: () => void;
}) {
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
          <BookRoomButtons onOpen={onOpenSearch} />
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
  return (
    <footer className="flex items-center justify-end gap-2 text-muted-foreground text-xs">
      <span className="inline-flex">
        <WifiIcon aria-hidden="true" className="size-4" />
      </span>
      <span>{wifi.network}</span>
      <Separator className="my-auto h-3.5 self-center" orientation="vertical" />
      <span>{messages.shell.footer.passwordLabel}</span>
      <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-foreground">
        {wifi.password}
      </span>
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
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <ShellSidebar isAdmin={isAdmin} onOpenSearch={openSearch} />
      <SearchDialog onOpenChange={setSearchOpen} open={searchOpen} />
      <SidebarInset>
        <div className="flex w-full max-w-[1800px] flex-1 flex-col gap-3 px-2 py-2 md:px-4 md:py-3">
          {children}
          <ShellFooter wifi={wifi} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
