-- RLS for the single-row site settings: every authenticated viewer reads
-- (the shell footer shows the Wi-Fi credentials), only the admin claim
-- writes. The row is single by settings.setting_id, seeded with the default
-- Wi-Fi credentials.

begin;
select plan(8);

-- Fixtures: one admin, one member company user.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111001', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

-- Company session (Rituals).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';

select is(
  (select setting_wifi_network || '/' || setting_wifi_password from public.settings),
  'TheSocialHouseguest/SocialHouse',
  'member reads the seeded Wi-Fi credentials');
select throws_ok(
  'insert into public.settings (setting_wifi_network, setting_wifi_password) values (''X'', ''y'')',
  '42501', null,
  'member cannot insert settings');
select lives_ok(
  'update public.settings set setting_wifi_password = ''hax''',
  'member update is silently scoped to zero rows by RLS');
select lives_ok(
  'delete from public.settings',
  'member delete is silently scoped to zero rows by RLS');
select is(
  (select setting_wifi_network || '/' || setting_wifi_password from public.settings),
  'TheSocialHouseguest/SocialHouse',
  'member writes changed nothing');

-- Admin session.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111001","role":"authenticated","app_role":"admin"}';

select lives_ok(
  'update public.settings set setting_wifi_network = ''NewGuestNet'', setting_wifi_password = ''NewPass'' where setting_id = 1',
  'admin updates the settings row');
select is(
  (select setting_wifi_network || '/' || setting_wifi_password from public.settings),
  'NewGuestNet/NewPass',
  'admin update is visible to the next read');
select throws_ok(
  'insert into public.settings (setting_wifi_network, setting_wifi_password) values (''X'', ''y'')',
  '23505', null,
  'settings stay single-row');

select * from finish();
rollback;
