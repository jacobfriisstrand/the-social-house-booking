// The shell's nav model (#55): which links exist, grouped for the sidebar,
// and what counts as active. Nav shows only routes that exist — each later
// issue adds its own entry with its page. The member bookings link is
// hidden from admins: they have no company, so the page would always be
// empty (issue #55, recorded in docs/design/DESIGN.md).
import {
  Building2Icon,
  CalendarIcon,
  DoorOpenIcon,
  HouseIcon,
  type LucideIcon,
  SettingsIcon,
} from "lucide-react";
import { messages } from "@/messages/da";

export interface ShellNavLink {
  href: string;
  icon: LucideIcon;
  label: string;
}

export function shellMainLinks(isAdmin: boolean): ShellNavLink[] {
  const links: ShellNavLink[] = [
    { href: "/", icon: HouseIcon, label: messages.shell.home },
  ];
  if (!isAdmin) {
    links.push({
      href: "/bookings",
      icon: CalendarIcon,
      label: messages.shell.bookings,
    });
  }
  links.push({
    href: "/rooms",
    icon: DoorOpenIcon,
    label: messages.shell.rooms,
  });
  return links;
}

export function shellAdminLinks(): ShellNavLink[] {
  return [
    {
      href: "/admin/rooms",
      icon: DoorOpenIcon,
      label: messages.rooms.listTitle,
    },
    {
      href: "/admin/companies",
      icon: Building2Icon,
      label: messages.shell.companies,
    },
    {
      href: "/admin/settings",
      icon: SettingsIcon,
      label: messages.shell.settings,
    },
  ];
}

export function isShellLinkActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
