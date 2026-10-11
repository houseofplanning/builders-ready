-- =========================================================================
-- Builders Ready — Migration 42: Indicative guidelines — Kitchen, Rewire,
-- Electric boiler
-- =========================================================================
-- Kitchen refit (by tier, staged), full rewire (by bedrooms + optional plaster
-- making-good), electric boiler (by kW band, supply+labour). basis='indicative'
-- (range + banner). Stage splits + assumptions in @br/shared. Rates ex-VAT, cited.
-- =========================================================================
insert into public.material_items
  (code, name, category, trade_category, unit, base_unit_cost_pence, coverage_m2_per_litre, source, priced_on)
values
  ('KITCHEN-BUDGET','Kitchen refit — budget','project','Kitchens','job',700000,null,'Budget kitchen refit all-in (UK guides £5-10k 2026)','2026-10-11'),
  ('KITCHEN-MID','Kitchen refit — mid-range','project','Kitchens','job',1500000,null,'Mid-range kitchen refit all-in (UK guides £10-20k 2026)','2026-10-11'),
  ('KITCHEN-PREMIUM','Kitchen refit — premium','project','Kitchens','job',2800000,null,'Premium kitchen refit all-in (UK guides £20-35k 2026)','2026-10-11'),
  ('REWIRE-1BED','Full rewire — 1 bed','project','Electrical','job',380000,null,'1-bed rewire all-in (Checkatrade £3-4.8k 2026)','2026-10-11'),
  ('REWIRE-2BED','Full rewire — 2 bed','project','Electrical','job',480000,null,'2-bed rewire all-in (UK guides £4-5.5k 2026)','2026-10-11'),
  ('REWIRE-3BED','Full rewire — 3 bed','project','Electrical','job',620000,null,'3-bed rewire all-in (Checkatrade £4.45-8k 2026)','2026-10-11'),
  ('REWIRE-4BED','Full rewire — 4 bed','project','Electrical','job',800000,null,'4-bed rewire all-in (UK guides £6.5-9k 2026)','2026-10-11'),
  ('REWIRE-5BED','Full rewire — 5 bed','project','Electrical','job',1050000,null,'5-bed rewire all-in (Checkatrade £7.5-12.5k 2026)','2026-10-11'),
  ('ELEC-BOILER-SMALL','Electric boiler 6-9kW (supply)','heating','Heating & gas','each',110000,null,'Electric boiler 6-9kW (1-2 bed) supply ex-VAT','2026-10-11'),
  ('ELEC-BOILER-MEDIUM','Electric boiler 9-12kW (supply)','heating','Heating & gas','each',150000,null,'Electric boiler 9-12kW (3 bed) supply ex-VAT','2026-10-11'),
  ('ELEC-BOILER-LARGE','Electric boiler 12-15kW (supply)','heating','Heating & gas','each',200000,null,'Electric boiler 12-15kW (4+ bed) supply ex-VAT','2026-10-11'),
  ('ELEC-BOILER-SUNDRIES','Wiring, pipework & fittings','heating','Heating & gas','job',10000,null,'Electric boiler install sundries allowance; editable','2026-10-11')
on conflict (code) do update set
  name=excluded.name, category=excluded.category, trade_category=excluded.trade_category, unit=excluded.unit,
  base_unit_cost_pence=excluded.base_unit_cost_pence, coverage_m2_per_litre=excluded.coverage_m2_per_litre,
  source=excluded.source, priced_on=excluded.priced_on, active=true;

insert into public.quote_templates
  (tenant_id, key, name, summary, trade_category, project_type, engine_key, inputs_schema, version, active, basis)
values
  (null,'kitchen_refit','Kitchen refit','Guideline kitchen cost by tier, broken into stages.','Kitchens','kitchen','kitchen_refit',
   '[{"key":"tier","label":"Specification","type":"select","options":[{"value":"budget","label":"Budget"},{"value":"mid","label":"Mid-range"},{"value":"premium","label":"Premium"}],"default":"mid"},{"key":"margin_percent","label":"Add margin %","unit":"%","type":"number","default":0}]'::jsonb,
   1,true,'indicative'),
  (null,'electrical_rewire','Electrical rewire','Guideline full rewire by property size.','Electrical',null,'electrical_rewire',
   '[{"key":"bedrooms","label":"Bedrooms","type":"select","options":[{"value":"1","label":"1 bed"},{"value":"2","label":"2 bed"},{"value":"3","label":"3 bed"},{"value":"4","label":"4 bed"},{"value":"5","label":"5 bed"}],"default":"3"},{"key":"plaster_making_good","label":"Include plaster making-good?","type":"bool","default":true},{"key":"margin_percent","label":"Add margin %","unit":"%","type":"number","default":0}]'::jsonb,
   1,true,'indicative'),
  (null,'electric_boiler','Electric boiler','Electric boiler replacement, sized by kW.','Heating & gas',null,'electric_boiler',
   '[{"key":"size_band","label":"Boiler size","type":"select","options":[{"value":"small","label":"6-9 kW (1-2 bed)"},{"value":"medium","label":"9-12 kW (3 bed)"},{"value":"large","label":"12-15 kW (4+ bed)"}],"default":"medium"},{"key":"margin_percent","label":"Your margin","unit":"%","type":"number","default":20}]'::jsonb,
   1,true,'indicative')
on conflict (key) do update set
  name=excluded.name, summary=excluded.summary, trade_category=excluded.trade_category, project_type=excluded.project_type,
  engine_key=excluded.engine_key, inputs_schema=excluded.inputs_schema, basis=excluded.basis,
  version=public.quote_templates.version + 1, active=true;
