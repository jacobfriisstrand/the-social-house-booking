-- Internal events that block rooms. Admin-managed; members see them only
-- through the calendar_entries projection (#12). No PII on the base table,
-- but the default rule keeps it admin-only (#19).

create policy house_events_admin_all on public.house_events
  for all to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy house_event_rooms_admin_all on public.house_event_rooms
  for all to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');
