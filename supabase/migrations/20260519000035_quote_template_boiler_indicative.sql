-- =========================================================================
-- Builders Ready — Migration 35: indicative guideline templates + boiler
-- =========================================================================
-- Adds quote_templates.basis: 'measured' (precise, quantity-driven) vs
-- 'indicative' (a size/tier guideline from published benchmark costs, to be
-- refined on survey — shown with a ± range + an "adjust before sending"
-- banner). First guideline template: boiler replacement (engine
-- 'boiler_replacement'). Prices ex-VAT, cited; labour/powerflush norms live
-- in @br/shared (BOILER_ASSUMPTIONS).
-- =========================================================================
alter table public.quote_templates
  add column if not exists basis text not null default 'measured'
    check (basis in ('measured','indicative'));

insert into public.material_items
  (code, name, category, trade_category, unit, base_unit_cost_pence, coverage_m2_per_litre, source, priced_on)
values
  ('BOILER-BUDGET','Budget boiler (supply)','heating','Heating & gas','each',80000,null,
   'Budget combi/system (Ideal/Baxi), UK trade supply ex-VAT (fitted guides £1.8-3.2k)','2026-10-11'),
  ('BOILER-MID','Mid-range boiler (supply)','heating','Heating & gas','each',115000,null,
   'Mid (Worcester Bosch/Vaillant), UK trade supply ex-VAT','2026-10-11'),
  ('BOILER-PREMIUM','Premium boiler (supply)','heating','Heating & gas','each',165000,null,
   'Premium (Viessmann/Worcester 8000), UK trade supply ex-VAT','2026-10-11'),
  ('CYLINDER-UNVENTED','Unvented hot water cylinder (supply)','heating','Heating & gas','each',55000,null,
   'Unvented cylinder ~210L, UK merchant ex-VAT','2026-10-11'),
  ('MAG-FILTER','Magnetic system filter (supply & fit)','heating','Heating & gas','each',11000,null,
   'Magnetic filter supply+fit (~£100-200; Checkatrade/iHeat)','2026-10-11'),
  ('SMART-CONTROLS','Smart heating controls (supply)','heating','Heating & gas','each',15000,null,
   'Smart thermostat/programmer, UK retail ex-VAT','2026-10-11'),
  ('BOILER-SUNDRIES','Flue, fittings & pipework sundries','heating','Heating & gas','job',12000,null,
   'Flue kit, valves, fittings allowance; editable','2026-10-11')
on conflict (code) do update set
  name=excluded.name, category=excluded.category, trade_category=excluded.trade_category, unit=excluded.unit,
  base_unit_cost_pence=excluded.base_unit_cost_pence, coverage_m2_per_litre=excluded.coverage_m2_per_litre,
  source=excluded.source, priced_on=excluded.priced_on, active=true;

insert into public.labour_rates (trade, unit, base_rate_pence, source, priced_on)
values ('gas_engineer','day',35000,
   'Gas Safe engineer day rate (£300-500; Checkatrade/MyJobQuote 2026). Set your own.','2026-10-11')
on conflict (trade, unit) do update set
  base_rate_pence=excluded.base_rate_pence, source=excluded.source, priced_on=excluded.priced_on, active=true;

insert into public.quote_templates
  (tenant_id, key, name, summary, trade_category, project_type, engine_key, inputs_schema, version, active, basis)
values
  (null,'boiler_replacement','Boiler replacement',
   'Combi or system swap - a tiered guideline you refine on survey.',
   'Heating & gas',null,'boiler_replacement',
   '[{"key":"boiler_type","label":"Boiler type","type":"select","options":[{"value":"combi","label":"Combi"},{"value":"system","label":"System + cylinder"}],"default":"combi"},{"key":"tier","label":"Quality tier","type":"select","options":[{"value":"budget","label":"Budget (Ideal/Baxi)"},{"value":"mid","label":"Mid (Worcester/Vaillant)"},{"value":"premium","label":"Premium (Viessmann)"}],"default":"mid"},{"key":"property_size","label":"Property size","type":"select","options":[{"value":"small","label":"1-2 bed"},{"value":"medium","label":"3 bed"},{"value":"large","label":"4+ bed"}],"default":"medium"},{"key":"powerflush","label":"Include power flush?","type":"bool","default":true},{"key":"radiators","label":"Radiators","unit":"rads","type":"number","default":8,"showIf":"powerflush"},{"key":"magnetic_filter","label":"Fit a magnetic filter?","type":"bool","default":true},{"key":"smart_controls","label":"Add smart controls?","type":"bool","default":false},{"key":"margin_percent","label":"Your margin","unit":"%","type":"number","default":20}]'::jsonb,
   1,true,'indicative')
on conflict (key) do update set
  name=excluded.name, summary=excluded.summary, trade_category=excluded.trade_category, project_type=excluded.project_type,
  engine_key=excluded.engine_key, inputs_schema=excluded.inputs_schema, basis=excluded.basis,
  version=public.quote_templates.version + 1, active=true;
