-- House Service and House Host are part of the default catalogue, so they
-- are seeded into every database (ADR-0015). seed.sql covers local only;
-- this migration delivers them to cloud projects via `supabase db push`
-- (docs/agents/supabase.md). Fixed ids keep environments aligned, and the
-- `on conflict` guard makes re-runs a no-op.
insert into public.addons (
  addon_id, addon_name, addon_description, addon_price_ore,
  addon_pricing_model, addon_sort_order
) values
  (
    '00000000-0000-0000-0000-0000000000d1',
    'House Service',
    'The Social House gør lokalet klar og rydder op efter mødet. Kaffe, te og vand, som I bestiller, serveres og ryddes bort. Til mindre møder uden forplejning: højst 5 deltagere og højst 4 timer.',
    50000, 'fixed', 1
  ),
  (
    '00000000-0000-0000-0000-0000000000d2',
    'House Host',
    'Vært til stede under mødet: forberedelse og opsætning, servering af bestilt forplejning, praktisk hjælp og koordinering af særlige ønsker. Standardprisen er 1.000 kr ekskl. moms pr. mødedag. Anbefales ved mere end 5 deltagere, frokost eller anden forplejning, møder over 4 timer eller særlig opsætning. Over 15 deltagere eller komplekse behov: pris og briefing aftales særskilt.',
    100000, 'fixed', 2
  )
on conflict (addon_id) do nothing;