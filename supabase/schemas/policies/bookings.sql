-- Company-read-own (#5, #8): a company reads, creates, and cancels its own
-- bookings; the admin manages all. No delete policy: bookings are history
-- (#5), so nobody deletes through the Data API.

create policy bookings_select_own_or_admin on public.bookings
  for select to authenticated
  using (
    booking_company_id = (select c.company_id from public.companies c where c.company_auth_user_id = auth.uid())
    or (auth.jwt() ->> 'app_role') = 'admin'
  );

create policy bookings_insert_own_or_admin on public.bookings
  for insert to authenticated
  with check (
    booking_company_id = (select c.company_id from public.companies c where c.company_auth_user_id = auth.uid())
    or (auth.jwt() ->> 'app_role') = 'admin'
  );

create policy bookings_update_own_or_admin on public.bookings
  for update to authenticated
  using (
    booking_company_id = (select c.company_id from public.companies c where c.company_auth_user_id = auth.uid())
    or (auth.jwt() ->> 'app_role') = 'admin'
  )
  with check (
    booking_company_id = (select c.company_id from public.companies c where c.company_auth_user_id = auth.uid())
    or (auth.jwt() ->> 'app_role') = 'admin'
  );

-- Add-ons on a booking follow the booking's ownership; the unit price is a
-- snapshot (ADR-0005), frozen after confirmation by the
-- booking_addons_snapshot_immutable trigger (#24).
create policy booking_addons_select_own_or_admin on public.booking_addons
  for select to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.booking_id = booking_addon_booking_id
        and (
          b.booking_company_id = (select c.company_id from public.companies c where c.company_auth_user_id = auth.uid())
          or (auth.jwt() ->> 'app_role') = 'admin'
        )
    )
  );

create policy booking_addons_insert_own_or_admin on public.booking_addons
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.bookings b
      where b.booking_id = booking_addon_booking_id
        and (
          b.booking_company_id = (select c.company_id from public.companies c where c.company_auth_user_id = auth.uid())
          or (auth.jwt() ->> 'app_role') = 'admin'
        )
    )
  );

create policy booking_addons_update_own_or_admin on public.booking_addons
  for update to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.booking_id = booking_addon_booking_id
        and (
          b.booking_company_id = (select c.company_id from public.companies c where c.company_auth_user_id = auth.uid())
          or (auth.jwt() ->> 'app_role') = 'admin'
        )
    )
  )
  with check (
    exists (
      select 1
      from public.bookings b
      where b.booking_id = booking_addon_booking_id
        and (
          b.booking_company_id = (select c.company_id from public.companies c where c.company_auth_user_id = auth.uid())
          or (auth.jwt() ->> 'app_role') = 'admin'
        )
    )
  );

create policy booking_addons_delete_own_or_admin on public.booking_addons
  for delete to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.booking_id = booking_addon_booking_id
        and (
          b.booking_company_id = (select c.company_id from public.companies c where c.company_auth_user_id = auth.uid())
          or (auth.jwt() ->> 'app_role') = 'admin'
        )
    )
  );
