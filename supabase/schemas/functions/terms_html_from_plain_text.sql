-- Wraps a plain-text terms version in the HTML the Tiptap editor produces
-- (#102): each line becomes the same visual line inside one paragraph —
-- &, < and > are escaped and \n becomes <br>, so a converted version
-- renders exactly as it did when it was plain text. One-time conversion
-- (migration 20261015092000_terms_plain_text_to_html) and seed.sql both
-- use it, so the seed texts and the published versions share one format.

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

-- Conversion-time helper: no runtime role calls it.
revoke execute on function public.terms_html_from_plain_text(text)
  from public, anon, authenticated;
