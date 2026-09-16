import { describe, expect, it } from "vitest";
import { isShellLinkActive, shellAdminLinks, shellMainLinks } from "./nav";

describe("shellMainLinks", () => {
  it("gives members the home and bookings links", () => {
    expect(shellMainLinks(false).map((link) => link.href)).toEqual([
      "/",
      "/bookings",
    ]);
  });

  it("hides the member bookings link from admins", () => {
    expect(shellMainLinks(true).map((link) => link.href)).toEqual(["/"]);
  });
});

describe("shellAdminLinks", () => {
  it("lists the admin routes that exist", () => {
    expect(shellAdminLinks().map((link) => link.href)).toEqual([
      "/admin/rooms",
      "/admin/companies",
      "/admin/settings",
    ]);
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
