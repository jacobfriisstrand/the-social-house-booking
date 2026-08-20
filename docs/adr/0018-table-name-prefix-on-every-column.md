# Table-name prefix on every column

Every column is prefixed with its table's name, singular. For example the `rooms` table uses `room_name`, `room_price_ore`, `room_capacity`; the `bookings` table uses `booking_id`, `booking_start_at`, `booking_status`. Join columns and foreign keys keep the owning table's prefix (e.g. `booking_room_id`), while the referenced primary keys keep their own prefix (`room_id`). This keeps columns self-describing in flat query results and survives SQL without table qualification. Applies to every table, migration, and RLS policy from now on.
