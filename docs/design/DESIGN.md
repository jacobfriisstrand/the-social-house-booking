# Design rules

The visual rules for the booking platform. Written for agents that build screens, whether as mockups or as React components. Read `CONTEXT.md` first for the words; this file covers how things look and where they sit.

`app/globals.css` is the source of truth for every value below. This file mirrors it so a mockup can be built without the Tailwind pipeline. If the two disagree, globals.css wins and this file is wrong. Change both in the same PR.

Danish UI, English code. Every label in an example here is Danish and uses the glossary's terms. Copy lives in `messages/da.ts`, never in a component.

## Brand

Two fixed inputs from The Social House: the tan primary and Poppins. Do not introduce a second accent colour or a second typeface. The logo is a 130x30 wordmark at `public/logo.svg`; render it at native size in the sidebar header.

Light mode only in v1.0. The `.dark` block in globals.css exists so shadcn components compile. Nobody designs or tests it.

## Colour

Tailwind classes come from `@theme inline` in globals.css, so `bg-primary`, `text-muted-foreground`, `border-border` and so on all resolve. Hex values are sRGB approximations for tools that cannot read oklch.

| Token | oklch | Hex | Tailwind | Use |
|---|---|---|---|---|
| background | 1 0 0 | #ffffff | `bg-background` | Page ground and the sidebar. |
| foreground | 0.27 0 0 | #262626 | `text-foreground` | Headings, body, values. |
| muted-foreground | 0.457 0 0 | #575757 | `text-muted-foreground` | Labels, hints, secondary text, struck prices. |
| card | 1 0 0 | #ffffff | `bg-card` | Cards, tables, the day grid, dialogs. Always with `border`. |
| muted | 0.9791 0.008 93.9 | #faf8f2 | `bg-muted` | The content panel, price summary panel, buffer strips, disabled slots, selected table rows. |
| secondary | 0.869 0.008 98.9 | #d5d4ce | `bg-secondary` | Secondary button ground, chips. |
| border | 0.959 0.009 84.6 | #f4f1eb | `border-border` | Every 1px line. Also `input` and `ring`. |
| primary | 0.718 0.103 67.3 | #cf975a | `bg-primary` | The tan. One primary action per view, selected calendar day, selected time slot, booking blocks. |
| primary-foreground | 0.27 0 0 | #262626 | `text-primary-foreground` | Text on tan. Dark, not white: white on tan is 2.6:1 and fails AA, dark is 5.9:1. |
| destructive | 0.488 0.2 28.2 | #b60008 | `bg-destructive` | Final confirm of cancellation, cancelled badge tint, field errors, cancellation bars in charts. |
| success | 0.6 0.1 150 | #519160 | `bg-success` | Discount lines, "faktureret" badge. |
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
| Page title (h1) | 28px / `text-3xl` | 600 | foreground | "Administrer lokaler" |
| Section title (h2) | 22px / `text-2xl` | 500 | foreground | "Lokaler" above the rooms carousel |
| Card title (h3) | 18px / `text-lg` | 500 | foreground | "Room of Relations" on a room card |
| Body | 14px / `text-sm` | 400 | foreground | descriptions, table cells |
| Label, hint | 12px / `text-xs` | 400 | muted-foreground | "Kapacitet", "Maks. 5" |
| Group header | 11px / `text-xs` uppercase, `tracking-wider` | 500 | muted-foreground | "ADMIN" in the sidebar |
| Value, price | 16px to 20px | 500 | foreground | "800 kr/time" |
| Big number | 28px / `text-3xl` | 600 | foreground | statistic tiles |

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
│ [logo]     ⊟ │  Page title                              │
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
│  Brugere     │ │                                      │ │
│  Tilkøb      │ │                                      │ │
│  Rabatter    │ │                                      │ │
│  Opslag      │ │                                      │ │
│  Statistik   │ │                                      │ │
│              │ │                                      │ │
│  Profil      │ └──────────────────────────────────────┘ │
│  Log ud      │              Wi-Fi thesocialhouseguest · … │
└──────────────┴──────────────────────────────────────────┘
```

- Sidebar is 16rem (256px, the shadcn default), white, no border, built on the shadcn Sidebar block for Base UI. Header holds the logo and the collapse toggle. "Book lokale" is a full-width primary button directly under the header and is the only tan button in the shell.
- Nav items: 20px icon, 14px label, `sidebar-accent` background and foreground text when active, muted-foreground otherwise. Group headers use the group-header type style.
- The two "Bookinger" and two "Lokaler" entries are intentional. The member ones show the company's own bookings and all rooms; the admin ones are the invoicing view and room management. They are told apart by their group, not their label.
- No top bar. The content column is three things: the page title, the content panel, and a footer line.
- The content panel is `bg-muted rounded-xl p-6` and fills the column height. Everything a page shows lives inside it as white bordered cards, so the panel is the one muted layer on the page.
- The footer line sits under the panel, right-aligned, 12px muted-foreground: a Wi-Fi icon, the guest network name, then "adgangskode" and the password in a mono chip. The text comes from `messages/da.ts` and is the same on every page. Identity lives in Profil and Log ud at the bottom of the sidebar, not here.
- Content column: `max-w-[1400px]`, padding `px-8 py-6` on desktop, `px-4 py-4` on phone.
- Tablet (`md` to `lg`): sidebar collapses to an icon rail, labels in tooltips, "Book lokale" becomes an icon button. Phone (below `md`): sidebar is an off-canvas sheet opened from a menu button at the top left of the content.

Login is outside the shell: a centred white card on the background with the logo, username, password and one primary button.

## Page patterns

**Page header.** Title left, at most one primary action right. Below it, when needed, a filter row (date, room, status) on one line that wraps on phone.

**Surfaces.** The page is white, the content panel is muted, cards on the panel are white with a 1px border. Never nest a card in a card.

**Empty state.** A white bordered card, `py-16`, centred: card-title line, one body sentence, optional secondary button. "Ingen kommende bookinger" / "Du har ingen kommende bookinger lige nu."

**Chips.** `Badge` variant outline with `rounded-full bg-secondary/40 px-2 py-0.5 text-xs` and a 16px icon: "1 - 12 personer", "25 m²". Used on room cards and the room detail page. Not clickable.

## Components

Every control on every page is a shadcn component from `components/ui/`, added with `npx shadcn@latest add` on the Base UI preset and then owned (see `docs/agents/ui.md`). No hand-rolled buttons, inputs, tables, badges, dialogs or sidebars, and no third-party UI kit. When a page needs something shadcn does not ship (the day grid, the room photo carousel, the stat tile), it is a feature component in `components/<feature>/` composed from shadcn primitives and the tokens above.

The mockups on the design canvas are drawn by hand to shadcn's default anatomy. The registry's sizes are the ones below; once a component is added, its file in `components/ui/` is the truth and the mockup follows it, not the other way round.

| Element | shadcn component | Default anatomy (with the 0.22rem unit) |
|---|---|---|
| Shell | `Sidebar` block (`SidebarProvider`, `SidebarMenuButton`, `SidebarGroupLabel`, `SidebarTrigger`) | 16rem wide, menu button `h-8 rounded-md px-2 text-sm`, group label `h-8 text-xs` |
| Buttons | `Button` variants default, outline, ghost, destructive; size default, sm, icon | `h-9 px-4 rounded-md text-sm font-medium`; icon `size-9` |
| Text and number inputs | `Input` inside `Field` | `h-9 px-3 rounded-md border text-sm` |
| Selects, month and room pickers | `Select` with `items` | trigger `h-9 px-3 rounded-md` |
| Date pickers | `Popover` + `Calendar` | selected day `bg-primary text-primary-foreground` |
| Checkboxes, row selection | `Checkbox` | `size-4 rounded-[4px] border` |
| Chips | `Badge` variant outline, `rounded-full` | `px-2 py-0.5 text-xs font-medium` |
| Status badges | `Badge` with the tint classes from the table below | `rounded-md px-2 py-0.5 text-xs font-medium` |
| Tables | `Table`, `TableHeader`, `TableRow`, `TableCell` | head `h-10 px-2 text-left`, cell `p-2 align-middle`, row `border-b` |
| Cards, tile groups, chart cards | `Card`, `CardHeader`, `CardTitle`, `CardContent` | `rounded-xl border py-6 shadow-sm`, header and content `px-6` |
| Tabs (member bookings, Opslag) | `Tabs`, `TabsList`, `TabsTrigger` | list `h-9 rounded-lg bg-muted p-[3px]` |
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

**Badges.** shadcn `Badge`, tinted: `rounded-md px-2 py-0.5 text-xs font-medium`.

| State | Token | Label |
|---|---|---|
| confirmed | none | no badge |
| awaiting verification | warning | "Afventer bekræftelse" |
| cancelled | destructive | "Aflyst" |
| fee applied | warning | "Gebyr" |
| House Event | info | "House Event" |
| not invoiced | warning | "Ikke faktureret" |
| invoiced | success | "Faktureret" |
| not invoicable | muted, muted-foreground | "Ikke fakturerbar" |

**Tables.** shadcn `Table` inside a `Card` with no padding, header row 12px muted, cells `p-2`, rows `h-12` with a border between. Numeric columns right-aligned with `tabular-nums`. Booking number in mono. Below `md` every wide table scrolls horizontally inside its card with the first column sticky; nothing stacks into cards. Selection checkboxes on the left when bulk actions exist (admin bookings). Totals row in the invoicing view is `font-medium` on a muted ground.

**Dialogs and sheets.** Dialogs for flows the user starts (search, booking, confirmations). Sheets from the right for details of a thing the user clicked (a booking on the grid). Both white on a dimmed page, `shadow-lg`, radius, close icon top right. On phone every dialog is full-screen and every sheet slides from the bottom.

**Toasts.** One library, sonner through shadcn. Every server action result ends in a toast: success or failure, one line, Danish. Bottom right on desktop, top on phone. Field errors stay inline; a toast never names a field. Page-level error alerts are not used.

**Confirm before destroying.** Cancellation, marking as invoiced, deleting a room or a user: a dialog with the consequence in one sentence, a secondary "Fortryd" and a destructive confirm. The fee, if any, is stated in the sentence.

## Screens

### Hjem

Three sections in this order, each with a section title:

1. **Opslag.** A strip of cards, one per active message or today's House Event. House Event cards carry the info badge. Admin sees a ghost edit button on the strip; members do not. Hidden entirely when empty.
2. **Dagens overblik.** The day grid (below). A date control on the right: "Vælg dato" secondary button, then a prev/next pair with the date between them.
3. **Lokaler.** A horizontal carousel of room cards with prev/next ghost icon buttons top right. Cards open the room detail page.

### Day grid

The signature component, same for admin and members.

- Rows are 30-minute slots from 09:00 to 22:00, fixed. Row height `h-9`. The time column is 72px, sticky, 14px muted-foreground `tabular-nums`.
- Columns are rooms in display order, headers 14px foreground, centred, `h-14`. Column dividers and row lines are `border`.
- A booking is a solid primary block spanning its slots, `rounded-lg`, 1px darker edge (`chart-2`). Text inside is `text-sm text-primary-foreground`: company display name top left, time range bottom left ("19:00 - 21:30"). Below `h-9`-worth of height only the name shows. Members see the company display name and nothing else, per the spec's visibility rules. The company's own bookings add the booker's name after the company name.
- The 30-minute buffer is a muted block with a border, no text, directly below the booking. It is never billed and never labelled.
- A House Event is an info block with the event title. It renders in every affected room's column.
- Click a block to open the booking sheet (admin sees the internal note, booker contact and pricing; members see room, time, company). Click an empty slot to open the booking dialog with room, date and start pre-filled. No hover effects beyond the cursor.
- Below `md` the grid scrolls horizontally inside its card with the time column sticky.

Day view only. Week and month views are out of v1.0 (ADR-0022) even though the spec lists them.

### Book lokale

1. "Book lokale" opens a dialog with room (default "Alle lokaler"), date, start time, end time, participants, and a primary "Søg".
2. Results are a page at `/lokaler?dato=…&fra=…&til=…&personer=…` titled "Ledige lokaler" with a 3-column card grid (1 column on phone, 2 on tablet). Empty state: "Ingen ledige lokaler i det valgte tidsrum."
3. A room card: photo carousel with two round ghost arrows bottom right of the photo, then name (card title), capacity and size chips, then a two-column price row: "Normalpris" struck in muted-foreground left, "Din pris" in 18px foreground right. When the company has no discount the struck price is omitted and "Din pris" sits alone.
4. The room detail page is two columns on desktop (info 40%, photos 60%), one column on phone with photos first. Left: bold title, chips row (size, capacity, price per hour), a border, description, a border, "Tilkøb" list where each add-on has its price as a chip ("+ 35 kr", "Gratis", "+ 200 kr / person"). Right: photos stacked, `rounded-lg`. A sticky bottom bar spans the content column: room name left, "Normalpris" struck and "Din pris" centre-right, primary "Book nu" right. On phone the bar is a fixed footer.
5. "Book nu", and an empty-slot click on the grid, open the booking dialog.

### Booking dialog

Large dialog (`max-w-5xl`), full-screen on phone. Header: room name, close icon. Then a stats row in a muted band: "Kapacitet", "Pris pr. time", "Størrelse" as label-over-value pairs. Then a white bordered panel with three columns:

- Calendar month (shadcn Calendar, selected day in primary, past days disabled).
- Start-time list: one row per 30-minute slot, white bordered rows, unavailable ones muted and disabled (booked, buffered, past, outside 09:00 to 22:00), selected one in primary.
- End time select, participants input with hint "Maks. N", and any pre-filled search values.

Under the panel a one-line sentence in body text: "Dit møde starter onsdag 02/09/2026 kl. 19:00 og slutter kl. 21:30."

Then two columns: "Tilkøb" as checkboxes with price chips left; the price summary right as a muted panel with rows "Lokale", "Tilkøb", "Subtotal", the discount line in success ("Medlemsrabat (50 %)", negative amount), and "Total" bold at 20px with "ekskl. moms" in 12px muted after it. A terms checkbox ("Jeg accepterer bookingbetingelserne", linked) sits above a full-width primary "Book nu".

"Book nu" creates the hold and swaps the dialog body to the verification step: the same header, a sentence naming the booker's email, a six-digit code input, a hold countdown in muted text, secondary "Send ny kode", primary "Bekræft booking". Success closes the dialog and toasts "Booking bekræftet".

### Bookinger (member)

ADR-0013's table. Columns: booking number (mono), room, date, time, booker, price, discount, add-ons, fee, status badge. Tabs above: "Kommende", "Tidligere", "Aflyste". Row click opens the booking sheet with a destructive-flow "Aflys booking" button and the cancellation terms from the price snapshot.

### Lokaler (member)

Every room as the 3-column card grid without search parameters and without the struck price row when there is no discount.

### Bookinger (admin)

The invoicing view. Opens on the current month. Filter row: month picker, free period, company, room, invoicing status, member or external. Table with selection checkboxes, then booking number, company, room, date with the time range on a second muted line, hours, room price, discount, add-ons, fee, total excl. VAT, invoicing status badge. Totals row at the bottom for the filtered set. Bulk action "Markér som faktureret" as the page's primary button, enabled when rows are selected. House Events appear in this table with the info badge and "Ikke fakturerbar"; a filter hides them.

### Opslag (admin)

Two tabs: "Beskeder" and "House Events". Each is a table with a "Nyt opslag" / "Nyt House Event" primary button opening a dialog. A House Event dialog has date, start, end, affected rooms as checkboxes, optional title, short explanation. Messages have title, text, visible from and to.

### Statistik (admin)

ADR-0014's monthly economy overview. Page header with a month control (prev, month name, next). Then two tile groups side by side, each a white card with a title ("Bookingøkonomi", "Bookinger") and a period chip, tiles inside separated by borders in a 3-column grid (2 columns when a group has four tiles). A tile is a 12px muted label, a 28px 600 number, and a small secondary chip with last month's value. Groups cover total bookings, room hours, room-rental value after discount, add-ons and services, cancellation fees, total invoicing basis excl. VAT, and the member versus external split. Future bookings are a separate tile labelled "Forventet" and never sum into the invoicable amount.

Below, three white cards with monthly bar charts since January of the current year: bookings, cancellations, invoicing basis. Bars in primary, cancellations in destructive, months without data in muted. Card title 18px 500 with a 12px muted subtitle. No refresh buttons.

### Other admin pages

Lokaler, Brugere, Tilkøb, Rabatter, Profil: shadcn tables and forms under the rules above. Page title, primary "Opret …" top right, table in a white card, edit in a dialog or a sheet. Rooms have photo upload, capacity, size, price per hour in øre, description, sort order and active flag. Nothing here needs a mockup.

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
- The day grid is a `role="grid"` with `aria-label` per block ("Room of Power, 19:00 til 21:30, The Social House"). Blocks and empty slots are buttons, so keyboard users can open them.
- Focus ring is `ring` at 50% (from `outline-ring/50` in globals.css). Never remove it.
- Photos of rooms carry the room name as alt text; decorative arrows are hidden from screen readers.

## Mockups

The design canvas with Hjem, admin Bookinger and Statistik lives at https://claude.ai/code/artifact/71dbb84e-19ff-4446-94cd-e81cec439000. Its sources are in `docs/design/canvas/`; regenerate and republish from there rather than redrawing.

## Out of scope in v1.0

Dark mode. Week and month calendar views (ADR-0022). English UI (ADR-0016). Outlook sync surfaces. Payments. A global search bar. Any second brand colour.
