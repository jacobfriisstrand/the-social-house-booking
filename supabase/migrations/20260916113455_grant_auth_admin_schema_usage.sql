-- Supabase local stacks grant USAGE on the public schema to supabase_auth_admin
-- by default; the cloud bootstrap may not.  Without it the custom access token
-- hook fails with "permission denied for schema public" and sign-in breaks.
-- Fixed a prod incident 2026-09-16.

grant usage on schema public to supabase_auth_admin;
