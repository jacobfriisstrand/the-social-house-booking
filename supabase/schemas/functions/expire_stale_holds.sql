-- Sweeps stale holds to 'expired' (docs/agents/supabase.md, "Holds"): rows
-- no write touches after their booking_hold_expires_at. Called by the hourly
-- job (Netlify scheduled function) with the service-role key; rows a write
-- touches are already flipped by the bookings_live_hold trigger (#24).
-- Returns the number of rows flipped.

create or replace function public.expire_stale_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flipped integer;
begin
  update public.bookings
  set booking_status = 'expired',
      booking_updated_at = now()
  where booking_status = 'pending_verification'
    and booking_hold_expires_at is not null
    and booking_hold_expires_at <= now();

  get diagnostics v_flipped = row_count;
  return v_flipped;
end;
$$;

revoke execute on function public.expire_stale_holds()
  from public, anon, authenticated;
grant execute on function public.expire_stale_holds()
  to service_role;
