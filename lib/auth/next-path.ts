// Where login sends you afterwards (#88, ADR-0024). The booking link in
// Mail 4, 5 and 6 goes through `/login?next=…`: logged out, the visitor logs
// in and lands on the booking; logged in, the login page passes them straight
// on. Only a path on this site is honoured — an absolute or
// protocol-relative URL would turn the login page into an open redirect.
const ORIGIN = "https://same-site.invalid";

export function safeNextPath(value: string | null | undefined): string | null {
  if (!value?.startsWith("/")) {
    return null;
  }
  const url = new URL(value, ORIGIN);
  return url.origin === ORIGIN ? `${url.pathname}${url.search}` : null;
}

// The "Se eller afbook bookingen" link: the booking's sheet on Bookinger,
// behind the company login.
export const bookingLinkUrl = (siteUrl: string, bookingId: string): string =>
  `${siteUrl}/login?next=${encodeURIComponent(`/bookings?booking=${bookingId}`)}`;
