-- The audit trail is read-only from the Data API (#5): admin sees it all,
-- companies see none — their history surfaces as the booking overview (#8),
-- not as raw audit rows. The record_booking_history trigger is SECURITY
-- DEFINER, so it writes without a policy; no insert, update, or delete
-- policy exists, making the table append-only under RLS.

create policy booking_history_select_admin on public.booking_history
  for select to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin');