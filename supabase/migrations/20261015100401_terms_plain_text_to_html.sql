-- One-time conversion of the stored terms texts from plain text to the
-- editor's HTML (#102): drafts and published versions alike, so the
-- editor opens every version the same way and published versions and
-- recorded acceptances render exactly as they did before the cutover.
-- Rows that already begin with markup are left alone: they were saved by
-- the new editor before this migration ran.
update public.terms_versions
set terms_version_content = public.terms_html_from_plain_text(terms_version_content)
where terms_version_content not like '<%';
