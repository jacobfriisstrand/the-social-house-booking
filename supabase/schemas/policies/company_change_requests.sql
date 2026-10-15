-- Pending company changes and their token hashes are never exposed through
-- the Data API. Server actions use the service-role client and the restricted
-- RPCs below; the raw token is only present in an emailed link.

revoke all on table public.company_change_requests from anon, authenticated;
revoke all on table public.company_change_tokens from anon, authenticated;
