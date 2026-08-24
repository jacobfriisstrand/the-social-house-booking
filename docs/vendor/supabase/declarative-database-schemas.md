Source: https://supabase.com/docs/guides/local-development/declarative-database-schemas
Fetched: 2026-08-24

# Declarative database schemas

Manage your database schemas in one place and generate versioned migrations.

## Overview

Declarative schemas provide a developer-friendly way to maintain schema migrations.

[Migrations](https://supabase.com/docs/guides/deployment/database-migrations) are traditionally managed imperatively (you provide the instructions on how exactly to change the database). This can lead to related information being scattered over multiple migration files. With declarative schemas, you instead declare the state you want your database to be in, and the instructions are generated for you.

Because the schema files are the source of truth, make every change by editing them - not through Studio or the SQL editor. `supabase db diff` compares your schema files, not the live database, so changes made directly to the database are not picked up.

## Schema migrations

Schema migrations are SQL statements written in Data Definition Language. They are versioned in your `supabase/migrations` directory to ensure schema consistency between local and remote environments.

### Declaring your schema

1. **Create your first schema file**

Create a SQL file in `supabase/schemas` directory that defines an `employees` table.

```sql name=supabase/schemas/employees.sql
create table "employees" (
  "id" integer not null,
  "name" text
);
```

2. **Generate a migration file**

Generate a migration file by diffing against your declared schema.

```bash name=Terminal
supabase db diff -f create_employees_table
```

3. **Start the local database and apply migrations**

Start the local database first. Then, apply the migration manually to see your schema changes in the local Dashboard.

```bash name=Terminal
supabase start
supabase migration up
```

### Updating your schema

Caution: With declarative schemas, the files in `supabase/schemas/` are the source of truth. `supabase db diff` compares **those files** against your migrations - it does **not** read the live database. Changes you make directly (Studio, the SQL editor, `psql`) are invisible to the diff: it reports "No schema changes found" and the change is silently dropped. Always edit the schema files, then run `db diff`.

1. **Add a new column**

Edit `supabase/schemas/employees.sql` file to add a new column to `employees` table.

```sql name=supabase/schemas/employees.sql
create table "employees" (
  "id" integer not null,
  "name" text,
  "age" smallint not null
);
```

Note: Some entities like views and enums expect columns to be declared in a specific order. To avoid messy diffs, always append new columns to the end of the table.

2. **Generate a new migration**

Diff existing migrations against your declared schema.

```bash name=Terminal
supabase db diff -f add_age
```

3. **Review the generated migration**

Verify that the generated migration contain a single incremental change.

```sql name=supabase/migrations/<timestamp>_add_age.sql
alter table "public"."employees" add column "age" smallint not null;
```

4. **Apply the pending migration**

Start the database locally and apply the pending migration.

```bash name=Terminal
supabase migration up
```

### Deploying your schema changes

1. **Log in to the Supabase CLI**

[Log in](https://supabase.com/docs/reference/cli/supabase-login) via the Supabase CLI.

```bash name=Terminal
supabase login
```

2. **Link your remote project**

Follow the on-screen prompts to [link](https://supabase.com/docs/reference/cli/supabase-link) your remote project.

```bash name=Terminal
supabase link
```

3. **Deploy database changes**

[Push](https://supabase.com/docs/reference/cli/supabase-db-push) your changes to the remote database.

```bash name=Terminal
supabase db push
```

### Managing dependencies

As your database schema evolves, you will probably start using more advanced entities like views and functions. These entities are notoriously verbose to manage using plain migrations because the entire body must be recreated whenever there is a change. Using declarative schema, you can now edit them in-place so it’s much easier to review.

```sql name=supabase/schemas/employees.sql
create table "employees" (
  "id" integer not null,
  "name" text,
  "age" smallint not null
);

create view "profiles" as
  select id, name from "employees";

create function "get_age"(employee_id integer) RETURNS smallint
  LANGUAGE "sql"
AS $$
  select age
  from employees
  where id = employee_id;
$$;
```

Your schema files are run in lexicographic order by default. The order is important when you have foreign keys between multiple tables as the parent table must be created first. For example, your `supabase` directory may end up with the following structure.

```bash
.
└── supabase/
    ├── schemas/
    │   ├── employees.sql
    │   └── managers.sql
    └── migrations/
        ├── 20241004112233_create_employees_table.sql
        ├── 20241005112233_add_employee_age.sql
        └── 20241006112233_add_managers_table.sql
```

For small projects with only a few tables, the default schema order may be sufficient. However, as your project grows, you might need more control over the order in which schemas are applied. To specify a custom order for applying the schemas, you can declare them explicitly in `config.toml`. Any glob patterns will evaluated, deduplicated, and sorted in lexicographic order. For example, the following pattern ensures `employees.sql` is always executed first.

```toml name=supabase/config.toml
[db.migrations]
schema_paths = [
  "./schemas/employees.sql",
  "./schemas/*.sql",
]
```

### Pulling in your production schema

To set up declarative schemas on a existing project, you can pull in your production schema by running:

```bash name=Terminal
supabase db dump > supabase/schemas/prod.sql
```

From there, you can start breaking down your schema into smaller files and generate migrations. You can do this all at once, or incrementally as you make changes to your schema.

### Rolling back a schema change

During development, you may want to rollback a migration to keep your new schema changes in a single migration file. This can be done by resetting your local database to a previous version.

```bash name=Terminal
supabase db reset --version 20241005112233
```

After a reset, you can [edit the schema](#updating-your-schema) and regenerate a new migration file. Note that you should not reset a version that's already deployed to production.

If you need to rollback a migration that's already deployed, you should first revert changes to the schema files. Then you can generate a new migration file containing the down migration. This ensures your production migrations are always rolling forward.

Danger: SQL statements generated in a down migration are usually destructive. You must review them carefully to avoid unintentional data loss.

## Known caveats

Schema diffs are generated by `pg-delta`, the default diff engine, which tracks most database changes. However, there are edge cases where schema diff can fail. The known cases below were documented against the legacy [`migra`](https://github.com/djrobstep/migra) engine (still available via `enabled = false` under `[experimental.pgdelta]` in `config.toml`, or `--use-migra`); some, such as duplicated grants from default privileges, also apply to `pg-delta`. Review every generated migration regardless of engine.

If you need to use any of the entities below, remember to add them through [versioned migrations](https://supabase.com/docs/guides/deployment/database-migrations) instead.

### Data manipulation language

- DML statements such as `insert`, `update`, `delete`, etc., are not captured by schema diff

### View ownership

- [view owner and grants](https://github.com/djrobstep/migra/issues/160#issuecomment-1702983833)
- [security invoker on views](https://github.com/djrobstep/migra/issues/234)
- [materialized views](https://github.com/djrobstep/migra/issues/194)
- doesn’t recreate views when altering column type

### RLS policies

- [alter policy statements](https://github.com/djrobstep/schemainspect/blob/master/schemainspect/pg/obj.py#L228)
- [column privileges](https://github.com/djrobstep/schemainspect/pull/67)

### Other entities

- schema privileges are not tracked because each schema is diffed separately
- [comments are not tracked](https://github.com/djrobstep/migra/issues/69)
- [partitions are not tracked](https://github.com/djrobstep/migra/issues/186)
- [`alter publication ... add table ...`](https://github.com/supabase/cli/issues/883)
- [create domain statements are ignored](https://github.com/supabase/cli/issues/2137)
- [grant statements are duplicated from default privileges](https://github.com/supabase/cli/issues/1864)
