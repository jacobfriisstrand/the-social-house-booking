-- Manual amounts (#16) are admin billing data: only an admin adds them,
-- and a booking's company can read them — the platform shows a company
-- the basis for its invoices (CONTEXT.md "Member booking overview"), and
-- a manual amount is part of that basis (#9). No update or delete: an
-- added amount is part of the audit trail.

create policy manual_amounts_select_own_or_admin on public.manual_amounts
  for select to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.booking_id = manual_amount_booking_id
        and (
          b.booking_company_id = (select c.company_id from public.companies c where c.company_auth_user_id = auth.uid())
          or (auth.jwt() ->> 'app_role') = 'admin'
        )
    )
  );

create policy manual_amounts_insert_admin on public.manual_amounts
  for insert to authenticated
  with check ((auth.jwt() ->> 'app_role') = 'admin');
