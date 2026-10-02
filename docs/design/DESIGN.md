# Design rules

The visual rules for the booking platform. Written for agents that build screens, whether as mockups or as React components. Read `CONTEXT.md` first for the words; this file covers how things look and where they sit.

`app/globals.css` is the source of truth for every value below. This file mirrors it so a mockup can be built without the Tailwind pipeline. If the two disagree, globals.css wins and this file is wrong. Change both in the same PR.

Danish UI, English code. Every label in an example here is Danish and uses the glossary's terms. Copy lives in `messages/da.ts`, never in a component.

## Brand

Two fixed inputs from The Social House: the tan primary and Poppins. Do not introduce a second accent colour or a second typeface. The shell header carries the house mark: `public/logo-mark.svg` — the icon mark without the white ground — at 28px, with the brand as text ("TheSocialHouse", 20px semibold) beside it only when the sidebar is expanded, the mark alone on the icon rail (changed 2026-10-01), on the same centre line as the page title beside it. The full 130x30 wordmark stays at `public/logo.svg` for the 404 page.

Light mode only in v1.0. The `.dark` block in globals.css exists so shadcn components compile. Nobody designs or tests it.

## Colour

Tailwind classes come from `@theme inline` in globals.css, so `bg-primary`, `text-muted-foreground`, `border-border` and so on all resolve. Hex values are sRGB approximations for tools that cannot read oklch.

| Token | oklch | Hex | Tailwind | Use |
|---|---|---|---|---|
| background | 1 0 0 | #ffffff | `bg-background` | Page ground and the sidebar. |
| foreground | 0.27 0 0 | #262626 | `text-foreground` | Headings, body, values. |
| muted-foreground | 0.457 0 0 | #575757 | `text-muted-foreground` | Labels, hints, secondary text, struck prices. |
| card | 1 0 0 | #ffffff | `bg-card` | Cards, tables, the day grid, dialogs. Always with `border`. |
| muted | 0.9791 0.008 93.9 | #faf8f2 | `bg-muted` | The content panel, price summary panel, buffer strips, disabled slots, selected table rows. At 50% also the table header rows and the pagination footer. |
| secondary | 0.869 0.008 98.9 | #d5d4ce | `bg-secondary` | Secondary button ground, chips. |
| border | 0.959 0.009 84.6 | #f4f1eb | `border-border` | Every 1px line. Also `input` and `ring`. |
| primary | 0.718 0.103 67.3 | #cf975a | `bg-primary` | The tan. One primary action per view, selected calendar day, selected time slot, booking blocks. |
| primary-foreground | 0.27 0 0 | #262626 | `text-primary-foreground` | Text on tan. Dark, not white: white on tan is 2.6:1 and fails AA, dark is 5.9:1. |
| destructive | 0.488 0.2 28.2 | #b60008 | `bg-destructive` | Final confirm of cancellation, cancelled badge tint, field errors, cancellation bars in charts. |
| success | 0.6 0.1 150 | #519160 | `bg-success` | Discount lines, "bekræftet" and "faktureret" badges. |
| warning | 0.75 0.15 90 | #d3a813 | `bg-warning` | Awaiting verification, fee applied, "ikke faktureret". Foreground is dark. |
| info | 0.55 0.06 240 | #517791 | `bg-info` | House Event blocks and badges. |

Chart scale, all tan: `chart-1` 0.81/0.06 (#dcba98), `chart-2` 0.62/0.12 (#b57628), `chart-3` 0.55/0.15 (#a95b00), `chart-4` 0.49/0.15 (#964900), `chart-5` 0.42/0.12 (#763c00). Hue 67.3 throughout. Cancellations are the only series drawn in destructive.

Rules that follow from the palette:

- Badges are tints, not solids: `bg-success/10 text-success` and so on. Solid semantic backgrounds are for blocks on the day grid and nothing else.
- Muted on muted is forbidden. The content panel is the one muted layer on a page; everything inside it is a white card with a border. The exceptions are muted elements inside a white card (buffer strips, selected rows, the price summary inside the booking dialog).
- Text on background or card is foreground or muted-foreground. No third grey.
- Sidebar tokens mirror the main ones (`sidebar`, `sidebar-foreground`, `sidebar-accent`); the sidebar is white like the page, with no divider. The muted panel is what separates content from chrome.

## Typography

Poppins, loaded in `app/layout.tsx` with weights 400 to 900. Geist Mono for booking numbers only. Letter-spacing is -0.025em on body (`--tracking-normal`), so headings do not need extra tightening.

| Role | Size | Weight | Colour | Example |
|---|---|---|---|---|
| Page title (h1) | 20px / `text-xl` | 600 | foreground | "Administrer lokaler" |
| Section title (h2) | 18px / `text-lg` | 500 | foreground | "Lokaler" above the rooms carousel |
| Card title (h3) | 16px / `text-base` | 500 | foreground | "Room of Relations" on a room card |
| Body | 14px / `text-sm` | 400 | foreground | descriptions, table cells |
| Label, hint | 12px / `text-xs` | 400 | muted-foreground | "Kapacitet", "Maks. 5" |
| Group header | 12px / `text-xs` uppercase, `tracking-wider` | 500 | muted-foreground | "ADMIN" in the sidebar |
| Value, price | 16px to 20px | 500 | foreground | "800 kr/time" |
| Big number | 30px / `text-3xl` | 600 | foreground | statistic tiles |

The scale is Tailwind's defaults — 12 / 14 / 16 / 18 / 20 / 24 / 30 px, nothing set in globals.css. Restored 2026-09-29 from the 0.9 scale (decided 2026-09-16 in #4): the smaller scale read too small in daily use, and the count badges and pagination footer inherit the same tokens. Titles still step down one size each (page title `text-xl`, not `text-3xl`).

No eyebrows. The old front page put "THE DAILY" over "Booking overview"; the rule now is one bold title and nothing above it. The uppercase small style is reserved for sidebar group headers.

Numbers use `tabular-nums` everywhere a column lines up (tables, price summaries, the time column in the grid). The `booking_number` is `font-mono`.

## Spacing, radius, shadow

- Base spacing unit is 0.22rem, not Tailwind's 0.25rem. This is deliberate. Every `p-4`, `gap-6` and `h-10` is 0.88 of the Tailwind default, which is the compact density the old app had. Do not "fix" it, and do not mix in pixel values that assume a 4px grid.
- Radius follows shadcn: `--radius` is 0.325rem, so `rounded-md` (buttons, inputs, badges, grid blocks, nav items) is 3.2px, `rounded-lg` (dialogs) is 5.2px and `rounded-xl` (cards, the content panel) is 9.2px. `rounded-full` only for chips and the round icon buttons on photos.
- Shadows are near-invisible (`--shadow-sm` is two 5% black layers). Cards rely on their border, not their shadow. Use `shadow-lg` for dialogs and sheets, `shadow-sm` for the sticky price bar, nothing else.
- Icons are `lucide-react` at 20px (`size-5`), stroke 1.5. 16px inside chips and badges.

## Shell

One shell for everyone. Members and admins see the same sidebar; the admin group renders only when the JWT carries the admin role (see `docs/agents/auth.md`).

```
┌──────────────┬──────────────────────────────────────────┐
│ [huset]      │ ⊟ Page title                             │
│ ┌──────────┐ │ ┌──────────────────────────────────────┐ │
│ │Book lokale│ │ │ muted content panel                  │ │
│ └──────────┘ │ │                                      │ │
│  Hjem        │ │ white cards on the panel             │ │
│  Bookinger   │ │                                      │ │
│  Lokaler     │ │                                      │ │
│              │ │                                      │ │
│  ADMIN       │ │                                      │ │
│  Bookinger   │ │                                      │ │
│  Lokaler     │ │                                      │ │
│  Virksomheder│ │                                      │ │
│  Tilkøb      │ │                                      │ │
│  Rabatter    │ │                                      │ │
│  Opslag      │ │                                      │ │
│  Statistik   │ │                                      │ │
│              │ │                                      │ │
│  Profil      │ └──────────────────────────────────────┘ │
│  Log ud      │              Wi-Fi thesocialhouseguest · … │
└──────────────┴──────────────────────────────────────────┘
```

- Sidebar is 16rem (256px, the shadcn default), white, no border, built on the shadcn Sidebar block for Base UI. Header holds the house mark always — the brand text beside it when expanded, the mark alone on the icon rail (changed 2026-10-01) — in a row as tall as the page title row so the two share a centre line. On the phone sheet the text shows with the mark. "Book lokale" is a full-width primary button directly under the header and is the only tan button in the shell.
- The sidebar toggle sits outside the sidebar, on the page title row (2026-09-29): always visible, collapsed or expanded, flush with the column's left edge; on phone it opens the off-canvas sheet.
- Nav items: 20px icon, 14px label, `sidebar-accent` background and foreground text when active, muted-foreground otherwise. Group headers use the group-header type style. A nav item can carry a count badge in the `SidebarMenuBadge` slot (neutral chip; warning tint on the admin worklist), hidden at zero and on the icon rail (2026-09-29).
- The two "Bookinger" and two "Lokaler" entries are intentional. The member ones show the company's own bookings and all rooms; the admin ones are the invoicing view and room management. They are told apart by their group, not their label.
- No top bar. The content column is three things: the page title, the content panel, and a footer line.
- From tablet up the content column is exactly the viewport height (`md:h-svh`): the title, the panel and the footer line are always in view, and the panel scrolls inside (`md:overflow-y-auto`). The page itself never scrolls, in either direction: the content column is `min-w-0` next to the sidebar, so a page whose content has a minimum width (a wide table) scrolls inside its card instead of widening the column past the viewport (2026-09-23 in #81). Phone keeps the document scroll.
- The content panel is `bg-muted rounded-xl p-3` and fills the column height. Everything a page shows lives inside it as white bordered cards, so the panel is the one muted layer on the page.
- The footer line sits under the panel, right-aligned on tablet and desktop and centred on phone, 12px muted-foreground: a Wi-Fi icon, the network name, then "adgangskode" and the password in mono, foreground colour, no chip background. The values come from the single-row settings table and are admin-editable under Indstillinger; the seed defaults are `TheSocialHouseguest` / `SocialHouse`, which messages/da.ts also carries as the fallback on a fresh project. The text comes from `messages/da.ts` and is the same on every page. Identity lives in Profil and Log ud at the bottom of the sidebar, not here.
- Content column: `max-w-[1400px]`, `gap-3` between title, panel and footer line. Every shell gutter equals the sidebar's own padding (`p-2`): from tablet up the column is `py-2 pr-2 pl-0`, so the menu sits centred between the screen edge and the content; on phone it is `px-2 py-2` (2026-09-20 in #4).
- Tablet (`md` to `lg`): sidebar collapses to an icon rail, labels in tooltips, "Book lokale" becomes an icon button. Phone (below `md`): sidebar is an off-canvas sheet; the toggle on the title row opens it, and navigation closes it. "Book lokale" closes the sheet as the search dialog opens; the dialog is mounted by the shell outside the sidebar, never inside the sheet.

Decisions the shell (#55) records on top of these rules:

- The nav shows only routes that exist; each later issue adds its own entry with its page. At the time of the shell: Hjem (`/`), member Bookinger (`/bookings`), admin Lokaler (`/admin/rooms`), Virksomheder (`/admin/companies`) and Indstillinger (`/admin/settings`), and Log ud. No stub pages, no dead links.
- Member Bookinger is hidden for admins: they have no company, so the page would always be empty.
- "Book lokale" renders disabled; #4 wires the click to the search dialog.
- `/admin` redirects to `/` — one home for everyone, the day grid above.
- The collapse state follows the shadcn block's `sidebar_state` cookie.
- Footer line copy: seeded in the settings table (`TheSocialHouseguest` / `SocialHouse`), editable by admins under Indstillinger; `messages/da.ts` carries the same values as the fallback. Every viewer is a logged-in member, so the password in the bundle is intended.
- Paths stay English (`/rooms`, `/bookings`, `/admin/companies`); labels come from `messages/da.ts`.

Login is outside the shell: a centred white card on the background with the logo, email, password and one primary button.

## Page patterns

**Page header.** Title left, at most one primary action right. Below it, when needed, a filter row (date, room, status) on one line that wraps on phone.

**Surfaces.** The page is white, the content panel is muted, cards on the panel are white with a 1px border. Never nest a card in a card, except the framed sections on Hjem.

**Empty state.** A white bordered card, `py-16`, centred: card-title line, one body sentence, optional secondary button. "Ingen kommende bookinger" / "Du har ingen kommende bookinger lige nu."

**Long text.** A description that may run long is held to a few lines (4 for a room description, 3 for practical notes) with a soft fade at the cut, and gets a "Læs mere" / "Læs mindre" text button under it, foreground colour, underlined. It folds out by animating its height (300ms, off under reduced motion). The button shows only when the text is actually cut off. One component: `components/expandable-text.tsx`. In the booking dialog an add-on's description folds out from a shadcn `Accordion` trigger under its row: "Læs om House Host".

**Chips.** `Badge` variant outline with `rounded-full bg-secondary/40 px-2 py-0.5 text-xs` and a 16px icon: "1 - 12 personer", "25 m²". Used on room cards and the room detail page. Not clickable.

## Components

Every control on every page is a shadcn component from `components/ui/`, added with `npx shadcn@latest add` on the Base UI preset and then owned (see `docs/agents/ui.md`). No hand-rolled buttons, inputs, tables, badges, dialogs or sidebars, and no third-party UI kit. When a page needs something shadcn does not ship (the day grid, the room photo carousel, the stat tile), it is a feature component in `components/<feature>/` composed from shadcn primitives and the tokens above.

Every data table is fixed-layout (`table-fixed`, `w-full`, a `min-w-*`): the sticky or handle columns and the trailing actions column keep their widths, and the columns in between share the remaining width evenly (2026-10-02). The min-width is sized so no nowrap header or cell overflows, and the card's overflow container scrolls the table sideways when the screen narrows. Every data table's last column sits right-aligned — its header and its cells, the trailing actions column included (2026-10-02). The day grid is the calendar, not a data table, and keeps its room columns left.

The mockups on the design canvas are drawn by hand to shadcn's default anatomy. The registry's sizes are the ones below; once a component is added, its file in `components/ui/` is the truth and the mockup follows it, not the other way round.

| Element | shadcn component | Default anatomy (with the 0.22rem unit) |
|---|---|---|
| Shell | `Sidebar` block (`SidebarProvider`, `SidebarMenuButton`, `SidebarGroupLabel`, `SidebarTrigger`) | 16rem wide, menu button `h-8 rounded-md px-2 text-sm`, group label `h-8 text-xs` |
| Buttons | `Button` variants default, outline, ghost, destructive; size default, sm, icon | `h-9 px-4 rounded-md text-sm font-medium`; icon `size-9` |
| Text and number inputs | `Input` inside `Field` | `h-9 px-3 rounded-md border text-sm` |
| Selects, month and room pickers | `Select` with `items` | trigger `h-9 px-3 rounded-md` |
| Date pickers | `Popover` + `Calendar` | selected day `bg-primary text-primary-foreground` |
| Checkboxes, row selection | `Checkbox` | `size-4 rounded-[4px] border border-secondary`: the input border token is too light on a 16px box, so the box borrows the OTP slots' border (2026-09-23 in #81) |
| Chips | `Badge` variant outline, `rounded-full` | `px-2 py-0.5 text-xs font-medium` |
| Status badges | `Badge` with the tint classes from the table below | `rounded-md px-2 py-0.5 text-xs font-medium` |
| Tables | `Table`, `TableHeader`, `TableRow`, `TableCell` | head `h-10 px-2` on `bg-muted/50`, cell `p-2 align-middle`, row `border-b`, no vertical lines; titles align with their values — numeric titles `text-right` over right-aligned amounts (2026-09-29) |
| Cards, tile groups, chart cards | `Card`, `CardHeader`, `CardTitle`, `CardContent` | `rounded-xl border py-6 shadow-sm`, header and content `px-6` |
| Tabs (member bookings, Opslag) | `Tabs`, `TabsList`, `TabsTrigger` | list `h-9 rounded-lg bg-secondary p-[3px]`, active tab `bg-background`: the list sits on the muted panel, so it takes the shell's warm grey instead of muted, which vanished (2026-09-26 in #81) |
| Filter rows | `Field` + `Select` + `Button` in a flex row | controls all `h-9` |
| Dialogs | `Dialog` (search, booking, confirmations) and `AlertDialog` (destructive confirms) | `rounded-lg border shadow-lg p-6` |
| Booking details | `Sheet` side right | `w-3/4 sm:max-w-sm` |
| Toasts | `sonner` `Toaster` | bottom-right on desktop |
| Tooltips (icon rail) | `Tooltip` | |
| Empty state | `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription` inside a `Card` | |
| Stat tiles, day grid, photo carousel | feature components | tokens and type scale above |

Charts on Statistik use the shadcn `Chart` wrapper over Recharts, with the series colours as literal hex from the palette above.

**Buttons.** One primary (tan) per view. Secondary is the outline variant. Destructive red appears only on the final confirm inside an `AlertDialog`, never on a row. Ghost for icon-only actions (carousel arrows, close, collapse). Size: default `h-9`; `sm` in table rows. Labels are verbs: "Book nu", "Søg", "Gem", "Aflys booking".

**Forms.** shadcn `Field` with `react-hook-form` and zod (see `docs/agents/ui.md`). Label above, 12px muted. Input `h-9`, white, border, ring on focus. Hint below in 12px muted ("Maks. 5"). Error below in 12px destructive, replacing the hint. Required is the default; optional fields say "(valgfrit)" in the label. Selects use the shadcn Base UI `Select` with an `items` prop. Time selects list 30-minute steps.

**Badges.** shadcn `Badge`, tinted: `rounded-md px-2 py-0.5 text-xs font-medium`. Count chips (2026-09-29): the booking tabs and the sidebar's nav items carry counts as `Badge` variant `outline` on the muted ground (`bg-muted`), `tabular-nums`, hidden at zero; the sidebar's `SidebarMenuBadge` slot is that same `Badge`, positioned absolutely beside the menu button — it has no hover state of its own (2026-09-29), and the admin's outstanding-invoice count wears the warning tint, matching the "Ikke faktureret" badge.

| State | Token | Label |
|---|---|---|
| confirmed | success | "Bekræftet" |
| awaiting verification | warning | "Afventer bekræftelse" |
| cancelled | destructive | "Aflyst" |
| fee applied | warning | "Gebyr" |
| House Event | info | "House Event" |
| not invoiced | warning | "Ikke faktureret" |
| invoiced | success | "Faktureret" |
| not invoicable | muted, muted-foreground | "Ikke fakturerbar" |

**Tables.** shadcn `Table` inside a `Card` with no padding, header row 12px muted, cells `p-2`, rows `h-12` with a border between. Numeric columns right-aligned with `tabular-nums`. Booking number in mono. Below `md` every wide table scrolls horizontally inside its card with the first column sticky; nothing stacks into cards. Selection checkboxes on the left when bulk actions exist (admin bookings). Totals row in the invoicing view is `font-medium` on a muted ground. A table is as tall as its content (changed 2026-09-29): the card grows with its rows instead of filling the panel, and a list longer than the page is paginated instead of scrolling inside the card — see Pagination.

**Pagination.** Every list table paginates client-side: the rows are already in the browser, so a page is a slice and the URL carries `page` and `pageSize` (written with `window.history.replaceState`, defaults omitted). Footer drawn after the "icons only" example, sides settled 2026-09-29: the rows-per-page field on the left (20/40/60/80, 20 default, a new size restarts at page 1), and the "Viser X–Y af Z" summary with the icon-only Previous/Next on the right; the footer row hugs the table with no gap above it, and the member bookings card carries the "Alle priser ekskl. moms" line directly above the arrows. No page-number buttons; the summary carries the position. A tab switch starts the next tab on page 1. Card grids (rooms) do not paginate.

**Dialogs and sheets.** Dialogs for flows the user starts (search, booking, confirmations). Sheets from the right for details of a thing the user clicked (a booking on the grid). Both white on a dimmed page, `shadow-lg`, radius, close icon top right. On phone every dialog is full-screen and every sheet slides from the bottom; there the dialog's close button is a larger tap target (about 45px, 21px icon), and the booking dialog's calendar fills the width so the days are large tap targets. Dialogs fade and zoom in and out over 200ms, ease-out; the large booking dialog takes 300ms with a slight rise. Under reduced motion dialogs appear and disappear without animation.

**Toasts.** One library: the Base UI Toast (`components/ui/toast.tsx`), tan `bg-primary` with the type's icon, top right on every screen, stacked above dialogs and sheets (`z-100`) so a result raised from inside a dialog is never hidden behind its backdrop. Every server action result ends in a toast: success or failure, one line, Danish. Field errors stay inline; a toast never names a field. Page-level error alerts are not used.

**Confirm before destroying.** Cancellation, marking as invoiced, deleting a room or a user: a dialog with the consequence in one sentence, a secondary "Fortryd" and a destructive confirm. The fee, if any, is stated in the sentence.

## Screens

### Hjem

Three sections in this order. Each is a shadcn `Card` frame: the section title is its `CardTitle` (`text-lg`, an `h2` inside), the section's buttons its `CardAction`, the items its `CardContent` (decided 2026-09-29 in #12):

1. **Opslagstavle.** One card per active message or today's House Event that has not ended. The frame's description is today's date with a capital weekday ("Tirsdag 29/09/2026"), since the grid below can show another day. The admin's ghost edit button is the frame's action. House Event cards carry the info badge, the rooms and the time. Admin sees a ghost edit button on the strip, linking to Opslag; members do not. Hidden entirely when empty.
2. **Bookingoverblik.** The day grid (below), as a card inside the frame. The date control is the frame's action: "Vælg dato" secondary button, then a prev/next pair with the date between them. On phone it drops under the title.
3. **Lokaler.** A horizontal carousel of room cards; the prev/next ghost icon buttons are the frame's action. Cards open the room detail page.

These frames are the one place a card sits inside a card: the frame groups the section, the inner cards are its items.

### Day grid

The signature component, same for admin and members.

- Rows are 30-minute slots from 09:00 to 22:00, fixed. Row height `h-9`. The time column is 72px, sticky, 14px muted-foreground `tabular-nums`.
- Columns are rooms in display order, headers 14px foreground, centred, `h-14`. Column dividers and row lines are `border`.
- On today's date each room header carries a 12px muted status line, the notice board's "when occupied rooms free up": "Ledig nu"; "Ledig fra 14:00" (the end of what occupies the room, without the buffer, decided in #12); "Åbner kl. 08:00" before opening; "Lukket for i dag" after closing, on a closed day, or when what occupies the room runs to closing time or past it. Other dates show no status line.
- A booking is a solid primary block spanning its slots, `rounded-lg`, 1px darker edge (`chart-2`). Text inside is `text-sm text-primary-foreground`: company display name top left, time range bottom left ("19:00 - 21:30"). Below `h-9`-worth of height only the name shows. Members see the company display name and nothing else, per the spec's visibility rules. The company's own bookings add the booker's name after the company name.
- The 30-minute buffer is a muted block with a border, no text, directly below the booking. It is never billed and never labelled.
- A House Event is an info block with the event title ("House Event" when it has none). It renders in every affected room's column, with the buffer below it like a booking: Postgres blocks the room for 30 minutes after an event too (#24).
- Click a block to open the booking sheet (admin sees the internal note, booker contact and pricing; members see room, time, company). Click an empty slot to open the booking dialog with room, date and start pre-filled. No hover effects beyond the cursor.
- Below `md` the grid scrolls horizontally inside its card with the time column sticky.

Day view only. Week and month views are out of v1.0 (ADR-0022) even though the spec lists them.

### Book lokale

1. "Book lokale" opens a dialog with participants, date, start time, end time, and a primary "Søg". No room field: the search returns every room that is free and holds the party (decided 2026-09-16 in #4).
2. Results are a page at `/rooms?dato=…&fra=…&til=…&personer=…` titled "Ledige lokaler" with a 3-column card grid (1 column on phone, 2 on tablet). Empty state: "Ingen ledige lokaler i det valgte tidsrum."
3. A room card: photo carousel with two round ghost arrows bottom right of the photo, then name (card title), capacity and size chips, then a two-column price row: "Normalpris" struck in muted-foreground left, "Din pris" in 18px foreground right. When the company has no discount the struck price is omitted and "Din pris" sits alone.
4. The room detail page has a shadcn `Breadcrumb` under the title, `text-xs` and `gap-1` from the title: "Lokaler" (or "Ledige lokaler" with the search kept in the link) then the room name. It is two columns on desktop (info 40%, photos 60%), one column on phone with photos first. On desktop the card fills the panel and only the photos column scrolls, inside the card; the info column, the bar and the footer line stay in view. Left: bold title, chips row (size, capacity, price per hour), a border, description, a border, "Tilkøb" list where each add-on has its price as a chip ("+ 35 kr", "Gratis", "+ 200 kr / person"). Right: photos stacked, `rounded-lg`; below `lg`, where the page is one column, they are one shadcn `Carousel` with the room card's round ghost arrows instead of a stack. A bottom bar carries the price and "Book nu". On desktop it lies on the card's bottom edge as part of the content, and the photos scroll behind it. Below `lg` it is the content panel's bottom edge (flush with the panel, `rounded-b-xl`, a top border): room name left (hidden on phone), "Normalpris" struck and "Din pris" centre-right, primary "Book nu" right. It sticks to the viewport bottom while the panel scrolls and rests above the footer line, never over it.
5. "Book nu", and an empty-slot click on the grid, open the booking dialog. Arriving at a room from a search never opens it by itself: the visitor sees the room first, and "Book nu" opens the dialog with the searched date, times and participants pre-filled.

### Booking dialog

A step-by-step flow in one dialog (`max-w-3xl`, decided 2026-09-23 in #81), full-screen on phone. From `md` up the dialog has one fixed height (40rem, or the viewport less 2rem) so it never jumps between steps: the step's body scrolls inside it, the step navigation stays in view. Header: room name, close icon. Nothing else about the room is repeated here; the room page just showed it.

Under the header a step row: one numbered circle per step, joined by a track. Finished steps are primary with a tick, the current one primary with its number, the rest outlined in muted-foreground; the track is primary behind finished steps. Labels sit beside the circles from `md` up and are hidden on phone. Under the row, the current step's title in `text-base` medium: "Vælg dato og tidspunkt", "Vælg tilkøb", "Ansvarlig booker", "Oversigt over din booking", "Bekræft din booking"; on phone a muted "Trin 2 af 5" follows the title. The row is not clickable: "Tilbage" and "Næste" move between steps. shadcn ships no stepper, so it is a feature component, `components/bookings/booking-steps.tsx`.

Members see five steps; admins four, since their booking is confirmed at once (ADR-0023):

1. **Tidspunkt.** The white bordered panel in two rows. First, at equal width, the calendar month (shadcn Calendar, selected day in primary, past days disabled) and the start-time list (one row per 30-minute slot, white bordered rows, unavailable ones muted and disabled: booked, buffered, past, outside opening hours; the selected one in primary). Under them the end-time select and the participants input with hint "Maks. N", side by side. A search pre-fills all of them. the step fits the dialog's fixed height without scrolling from `md` up, six-row months included: the calendar has no padding of its own and its day cells are `h-9` pills rather than squares (phone keeps the square days as tap targets), and the start-time list is exactly as tall as the month beside it, so the list is the only thing that scrolls (2026-09-26 in #81).
2. **Tilkøb.** Two columns from `md` up, two to one, no borders: left, "Tilkøb" as checkboxes with price chips and the fold-out descriptions, one open at a time so the step never scrolls (2026-09-26 in #81); right, the catering rule with its required acceptance checkbox (#7). Stacked below `md`.
3. **Booker.** One sentence on why the person is asked for (a contact for the meeting; members also read that the code goes to the work email), then name, work email and mobile, one field per row. Admins choose the company above them.
4. **Oversigt.** Label-and-value rows: date with its weekday, time, company (admins), participants, add-ons or "Ingen", the booker with email and mobile in muted text under the name, centred in the space above the price summary, which sits at the bottom of the step as a muted panel with rows "Lokale", "Tilkøb", the discount line in success ("Medlemsrabat (50 %)", negative amount), and "Total" bold at 20px with "ekskl. moms" in 12px muted after it. The terms checkbox ("Jeg accepterer bookingbetingelserne", linked) sits on the button row, left of "Book nu"; its box stays on the label's line, the error goes under the label.
5. **Bekræft.** Members only, below.

Under every step: "Tilbage" (outline, from the second step on) left, "Næste" (primary) right; on Oversigt the primary is "Book nu" ("Opret booking" for admins) with the terms checkbox beside it. "Næste" validates only that step's fields and focuses the first invalid one; after a refused "Næste" the step's fields revalidate as they change, so an error clears the moment it is fixed. The server re-parses everything on "Book nu", and a server error on an earlier step's field returns to that step with the error shown. One form instance carries the values across steps, so going back loses nothing.

"Book nu" creates the hold and swaps the body to the verification step, with the step row on "Bekræft". The code is the step: a centred sentence naming the booker's email, the six-digit code in a shadcn `InputOTP` (one continuous row of six slots, 60px tall with `border-secondary` so the cells read clearly, centred, no separator, digits only) and the hold countdown in muted text directly under it, the three centred in the space; the frozen price summary (#6) sits at the bottom of the body, then secondary "Send ny kode" and primary "Bekræft booking". Closing the dialog here means starting over. Success closes the dialog, toasts "Booking bekræftet" and goes to the booking-complete page at `/bookings/[bookingId]/confirmed`: a centred card with a success check, "Tak for din booking", the booking number in mono, room, date, time, participants, booker and the expected total excl. VAT, then "Se bookinger" (primary, members) and "Book et lokale mere". An admin's booking for a company lands on the same page.

### Bookinger (member)

ADR-0013's table. Columns: booking number (mono), room, date and time (one column since 2026-10-01; the time range muted on a second line, as the admin table), booker, price, discount, add-ons, fee, status badge. Tabs above: "Alle" (default), "Kommende", "Tidligere", "Aflyste", each with its count as a neutral chip (2026-09-29). One text size in the cells, the table's `text-sm`, and one value per cell: the total in the price column, the percentage in the discount column, nothing on a second line (decided 2026-09-23 while reviewing #81). The add-ons column shows the lines' total, not each add-on as its own row, and the status column stacks its two badges vertically — the deliberate second line (2026-09-29) — and, as the table's last column, sits right-aligned (2026-10-02). The columns between the booking number and the status share the width evenly (table-fixed, 2026-10-02; the fee column is no longer separately narrow), and the table's min-width keeps it wide enough that the card scrolls it sideways when the screen narrows. The card is as tall as its content (changed 2026-09-29 from the #81 fill-the-panel scroll): the rows are paginated in the card footer instead of scrolling inside the card, a page taller than the panel scrolls the panel as before, and the vertical sticky header is gone with the internal scroll. The table still scrolls sideways inside the card when its columns outgrow the width, with the booking number column staying put. Rows are separated by the 1px `border` hairline — no vertical lines (2026-09-29) — and the header row sits on the muted/50 ground like every table, matching the pagination footer (2026-09-29; the `table-header` token is retired). The pagination footer hugs the card's bottom edge: rows-per-page left, summary and arrows right, and the "Alle priser ekskl. moms" line directly above the arrows (2026-09-29). The shell and the tabs never move. Row click opens the booking sheet with a destructive-flow "Aflys booking" button and the cancellation terms from the price snapshot. The price summary gained the manual amounts admin added after the meeting (#16, 2026-10-02): each is an extra price row — "Manuelt beløb" with the note as 12px muted under the amount, no timestamp, the company needs only what it was for — and the total includes them. The snapshot columns never move (ADR-0005); the amounts are the post-meeting additions shown on top, and a booking without amounts reads exactly as before.

### Lokaler (member)

Every room as the 3-column card grid without search parameters and without the struck price row when there is no discount.

### Bookinger (admin)

The minimal version shipped 2026-09-29: the outstanding-invoice worklist — ended bookings without an invoice, newest ended first, paginated, no filters, checkboxes or totals yet — the same set the sidebar badge counts. The manual amounts (#16, 2026-10-01) belong to it: a "Manuelt beløb" column between the date and the total shows each row's manual amounts as one sum ("-" when none), and a "Tilføj beløb" outline button per row opens the side panel — the added amounts with amount, note and who/when, then the add form (whole kroner, a required short explanation). The total includes the manual amounts; the column keeps them apart from the auto-computed basis. Amounts can only be added after the booking's end time, which the worklist guarantees and the database enforces. The description below is the full view it grows into.

The invoicing view. Opens on the current month. Filter row: month picker, free period, company, room, invoicing status, member or external. Table with selection checkboxes, then booking number, company, room, date with the time range on a second muted line, hours, room price, discount, add-ons, fee, total excl. VAT, invoicing status badge. Totals row at the bottom for the filtered set. Bulk action "Markér som faktureret" as the page's primary button, enabled when rows are selected. House Events appear in this table with the info badge and "Ikke fakturerbar"; a filter hides them.

### Opslag (admin)

Two tabs: "Beskeder" and "House Events". Each is a table with a "Nyt opslag" / "Nyt House Event" primary button opening the admin side panel (see "Other admin pages"). A House Event has date, start, end, affected rooms as checkboxes ("Tidspunkt og lokaler"), then optional title and short explanation ("Tekst til medlemmerne"). When bookings or other House Events are in the way (the 30-minute buffer counts), the panel saves nothing and lists them in a destructive `Alert` under the fields. The House Events tab lists today's events, finished ones included, and later ones. Messages have title, text, an on/off switch ("Vis på forsiden") and an optional last day ("Vis til og med"); there is no start date, a message shows from the moment it is on (decided in #12). The messages table shows a status badge: "Vises", "Slået fra" or "Udløbet".

### Statistik (admin)

ADR-0014's monthly economy overview. Page header with a month control (prev, month name, next). Then two tile groups side by side, each a white card with a title ("Bookingøkonomi", "Bookinger") and a period chip, tiles inside separated by borders in a 3-column grid (2 columns when a group has four tiles). A tile is a 12px muted label, a 28px 600 number, and a small secondary chip with last month's value. Groups cover total bookings, room hours, room-rental value after discount, add-ons and services, cancellation fees, total invoicing basis excl. VAT, and the member versus external split. Future bookings are a separate tile labelled "Forventet" and never sum into the invoicable amount.

Below, three white cards with monthly bar charts since January of the current year: bookings, cancellations, invoicing basis. Bars in primary, cancellations in destructive, months without data in muted. Card title 18px 500 with a 12px muted subtitle. No refresh buttons.

### Other admin pages

Lokaler, Virksomheder, Tilkøb, Rabatter, Indstillinger, Profil: shadcn tables and forms under the rules above. Page title, primary "Opret …" top right, table in a white card. Every admin create and edit uses the same side panel: a right-hand `Sheet` (`w-full sm:max-w-xl`, wider when the form needs it) with the title in its header, the fields in white cards with a section title, and the save button under them (decided 2026-09-29 in #12). Dialogs are for confirmations only. Rooms have photo upload, capacity, size, price per hour in øre, description, sort order and active flag. Nothing here needs a mockup.

## Formatting

- Money is integer øre, excl. VAT (ADR-0019, ADR-0020). Display through `lib/format.ts`. Cards and chips show whole kroner with the unit: "800 kr/time", "+ 35 kr". Summaries, tables and totals show øre: "625,00 kr". Every surface that shows a price says "ekskl. moms" once, in 12px muted, next to the total or in the table footer.
- Dates are dd/mm/yyyy: "02/09/2026". Weekday prefixes are lower-case and only in sentences: "onsdag 02/09/2026". Never month names in tables.
- Times are 24-hour "HH:mm". Ranges use a spaced hyphen: "19:00 - 21:30".
- Everything is displayed in Europe/Copenhagen (ADR-0021).
- Participants: "4 personer", capacity "1 - 12 personer". Area "25 m²".

## Responsive

Tailwind's breakpoints. Phone below `md` (768px), tablet `md` to `lg` (1024px), desktop `lg` and up. Mobile first in the code. The spec requires phone, tablet and desktop and an "add to home screen" manifest at `app/manifest.ts`; the icon there is the logo mark on a white ground.

Per-component behaviour is listed where it differs: sidebar (rail, sheet), tables and the grid (horizontal scroll, sticky first column), dialogs (full-screen), sheets (bottom), room grid (1 / 2 / 3 columns), room detail (stacked, fixed footer).

## Accessibility

- Text contrast: foreground on background is 14.8:1, muted-foreground on background is 7.0:1, foreground on primary is 5.9:1. Warning tint text uses `text-warning-foreground` on `bg-warning/20`, never warning-on-white at 12px.
- Every icon-only button has an `aria-label` from `messages/da.ts`.
- The day grid is a `<table>` with room column headers and time row headers; a block is a cell spanning its rows (`rowSpan`), so screen readers move through it by room and time. Blocks carry an `aria-label` ("Room of Power, 19:00 til 21:30, The Social House") and empty bookable slots one like "Book Room of Power kl. 10:00". Both are buttons, so keyboard users can open them (#12).
- Focus ring is `ring` at 50% (from `outline-ring/50` in globals.css). Never remove it.
- Photos of rooms carry the room name as alt text; decorative arrows are hidden from screen readers.

## Mockups

The design canvas with Hjem, admin Bookinger and Statistik lives at https://claude.ai/code/artifact/71dbb84e-19ff-4446-94cd-e81cec439000. Its sources are in `docs/design/canvas/`; regenerate and republish from there rather than redrawing.

## Out of scope in v1.0

Dark mode. Week and month calendar views (ADR-0022). English UI (ADR-0016). Outlook sync surfaces. Payments. A global search bar. Any second brand colour.
