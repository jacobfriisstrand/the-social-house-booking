import { describe, expect, it } from "vitest";
import { isShellLinkActive, shellAdminLinks, shellMainLinks } from "./nav";

describe("shellMainLinks", () => {
  it("gives members the home and bookings links", () => {
    const links = shellMainLinks(false);
    expect(links.map((link) => link.href)).toEqual([
      "/",
      "/bookings",
      "/rooms",
    ]);
    expect(links.find((link) => link.href === "/bookings")?.badgeTone).toBe(
      "neutral"
    );
  });

  it("hides the member bookings link from admins", () => {
    expect(shellMainLinks(true).map((link) => link.href)).toEqual([
      "/",
      "/rooms",
    ]);
  });
});

describe("shellAdminLinks", () => {
  it("lists the admin routes that exist", () => {
    expect(shellAdminLinks().map((link) => link.href)).toEqual([
      "/admin/statistics",
      "/admin/bookings",
      "/admin/rooms",
      "/admin/companies",
      "/admin/addons",
      "/admin/notices",
      "/admin/terms",
      "/admin/settings",
    ]);
  });

  it("marks the admin bookings item as the warning worklist", () => {
    const link = shellAdminLinks().find(
      (candidate) => candidate.href === "/admin/bookings"
    );
    expect(link?.badgeTone).toBe("warning");
  });
});

describe("isShellLinkActive", () => {
  it("matches the home link only on the root path", () => {
    expect(isShellLinkActive("/", "/")).toBe(true);
    expect(isShellLinkActive("/", "/bookings")).toBe(false);
  });

  it("matches section links on their subpages", () => {
    expect(isShellLinkActive("/admin/companies", "/admin/companies")).toBe(
      true
    );
    expect(
      isShellLinkActive("/admin/companies", "/admin/companies/8e693af5-1234")
    ).toBe(true);
    expect(isShellLinkActive("/admin/companies", "/admin/rooms")).toBe(false);
  });
});
