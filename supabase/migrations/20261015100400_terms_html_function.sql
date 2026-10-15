-- The terms texts switch from plain text to the Tiptap editor's HTML
-- (#102). The conversion helper wraps a plain text so it renders exactly
-- as before the cutover; it is declared in
-- supabase/schemas/functions/terms_html_from_plain_text.sql and repeated
-- here so this migration is self-contained on existing projects.
create or replace function public.terms_html_from_plain_text(plain_text text)
returns text
language sql
immutable
as $$
  -- chr(38) is '&': the replacement strings spell the entities without
  -- writing them literally.
  select '<p>'
    || replace(
         replace(
           replace(
             replace(plain_text, '&', chr(38) || 'amp;'),
             '<', chr(38) || 'lt;'),
           '>', chr(38) || 'gt;'),
         E'\n', '<br>')
    || '</p>'
$$;

revoke execute on function public.terms_html_from_plain_text(text)
  from public, anon, authenticated;
