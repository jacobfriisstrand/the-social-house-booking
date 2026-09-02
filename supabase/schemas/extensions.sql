-- Extensions the schema tree relies on. Declared here so the declarative
-- sync owns them; the migration 20260902171830_create_pgtap.sql creates it
-- for `db reset`/`db push` flows, which apply migrations only.

create extension if not exists pgtap with schema extensions;
