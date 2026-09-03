-- Extensions the schema tree relies on. Declared here so the declarative
-- sync owns them; the migration 20260902171830_create_pgtap.sql creates it
-- for `db reset`/`db push` flows, which apply migrations only.

create extension if not exists pgtap with schema extensions;

-- btree_gist backs the bookings_no_overlap exclusion constraint (#24).
create extension if not exists btree_gist with schema extensions;
