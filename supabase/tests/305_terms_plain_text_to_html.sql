-- The terms texts are stored as the editor's HTML (#102): the conversion
-- helper escapes markup and turns every line break into a hard break, and
-- every stored version (the seed's included) is markup, never raw plain
-- text. Entity spellings are built with chr(38) ('&') so the expected
-- strings name the entities instead of containing them.
begin;
select plan(5);

select is(
  public.terms_html_from_plain_text('Hej & velkommen' || chr(10) || 'Verden <kan> ses'),
  '<p>Hej ' || chr(38) || 'amp; velkommen<br>Verden ' || chr(38) || 'lt;kan' || chr(38) || 'gt; ses</p>',
  'escapes markup and turns newlines into hard breaks'
);

select is(
  public.terms_html_from_plain_text('A' || chr(10) || chr(10) || 'B'),
  '<p>A<br><br>B</p>',
  'a blank line stays a blank line'
);

select is(
  public.terms_html_from_plain_text(''),
  '<p></p>',
  'an empty text wraps to an empty paragraph'
);

select is(
  (select count(*) from public.terms_versions where terms_version_content not like '<%'),
  0::bigint,
  'every stored version is editor HTML'
);

select is(
  (select has_function_privilege('authenticated', 'public.terms_html_from_plain_text(text)', 'execute')),
  false,
  'members cannot call the conversion helper'
);

select * from finish();
rollback;
