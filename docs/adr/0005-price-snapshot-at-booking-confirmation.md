# Price snapshot at booking confirmation

When a booking is confirmed, the room price, discount, add-on prices, expected total, and cancellation terms are frozen. Later price or discount changes affect only new bookings, never confirmed ones, so invoices always match what was booked.

`booking_room_price_ore` carries the room's **total for the booked hours, before discount** — the frozen room rental, not the hourly price. Readers use it directly; nothing multiplies it by the hours again. A self-contained total is what makes the freeze real: if the column held the hourly price, a later edit to a booking's end time would silently change the implied room rental of a "frozen" row. (Pinned 2026-09-27 after the writer froze the hourly price while the seed and fixtures carried totals, which made the price panel stop adding up; found by `lib/bookings/new-booking.test.ts`.)
