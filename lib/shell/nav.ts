// The shell's nav model (#55): which links exist, grouped for the sidebar,
// and what counts as active. Nav shows only routes that exist — each later
// issue adds its own entry with its page. The member bookings link is
// hidden from admins: they have no company, so the page would always be
// empty (issue #55, recorded in docs/design/DESIGN.md).
import {
  Building2Icon,
  CalendarIcon,
  ChartColumnIcon,
  DoorOpenIcon,
  HouseIcon,
  type LucideIcon,
  MegaphoneIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShoppingBagIcon,
} from "lucide-react";
import { messages } from "@/messages/da";

export interface ShellNavLink {
  // The tone of the item's count badge, when the layout supplies one.
  // Neutral chips count what the item lists; the warning tint marks a
  // worklist that waits on admin action.
  badgeTone?: "neutral" | "warning";
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
      badgeTone: "neutral",
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

// Statistik leads the admin group (2026-10-10, #10).
export function shellAdminLinks(): ShellNavLink[] {
  return [
    {
      href: "/admin/statistics",
      icon: ChartColumnIcon,
      label: messages.shell.statistics,
    },
    {
      badgeTone: "warning",
      href: "/admin/bookings",
      icon: CalendarIcon,
      label: messages.shell.bookings,
    },
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
      href: "/admin/addons",
      icon: ShoppingBagIcon,
      label: messages.addons.title,
    },
    {
      href: "/admin/notices",
      icon: MegaphoneIcon,
      label: messages.shell.notices,
    },
    {
      href: "/admin/terms",
      icon: ScrollTextIcon,
      label: messages.shell.terms,
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
