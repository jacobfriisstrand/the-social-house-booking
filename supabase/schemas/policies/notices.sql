-- Notice board (#12): practical notices are member-visible by design;
-- admins curate them.

create policy notices_select_authenticated on public.notices
  for select to authenticated
  using (true);

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
