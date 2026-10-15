-- Notice board (#12): every logged-in member reads the notices that are on
-- and not past their end; admins read all of them and curate them.

create policy notices_select_visible_or_admin on public.notices
  for select to authenticated
  using (
    (auth.jwt() ->> 'app_role') = 'admin'
    or (notice_is_active and (notice_ends_at is null or notice_ends_at > now()))
  );

create policy notices_insert_admin on public.notices
  for insert to authenticated
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy notices_update_admin on public.notices
  for update to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy notices_delete_admin on public.notices
  for delete to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin');
