-- pgTAP for `supabase test db` (#24 pattern); the RLS tests (#19) and the
-- integrity tests (#24) run against it. Available in the bundled image and
-- on the hosted projects; created explicitly so local and CI match.

create extension if not exists pgtap with schema extensions;
