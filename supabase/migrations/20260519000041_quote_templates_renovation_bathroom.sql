-- =========================================================================
-- Builders Ready — Migration 41: Indicative guidelines — Full reno + Bathroom
-- =========================================================================
-- Full renovation (£/m² by scope: light/standard/full-gut) and bathroom refit
-- (by tier), split into stage allowances. basis='indicative' (±25% / ±20%
-- range + banner). Stage splits in @br/shared. Rates all-in, ex-VAT, cited.
-- =========================================================================
insert into public.material_items
  (code, name, category, trade_category, unit, base_unit_cost_pence, coverage_m2_per_litre, source, priced_on)
values
  ('RENO-LIGHT','Full renovation — light refresh','project','Full renovations','m²',50000,null,'Light refurb £/m² (decoration/flooring/cosmetic; UK guides 2026)','2026-10-11'),
  ('RENO-STANDARD','Full renovation — standard refurb','project','Full renovations','m²',130000,null,'Standard refurb £/m² (UK guides £1,100-1,400/m² 2026)','2026-10-11'),
  ('RENO-FULLGUT','Full renovation — full gut','project','Full renovations','m²',180000,null,'Full gut £/m² inc rewire/replumb/heating (UK guides £1,400-2,500/m² 2026)','2026-10-11'),
  ('BATH-BUDGET','Bathroom refit — budget','project','Bathrooms','job',380000,null,'Budget bathroom refit all-in (UK guides £2.5-5k 2026)','2026-10-11'),
  ('BATH-MID','Bathroom refit — mid-range','project','Bathrooms','job',750000,null,'Mid-range bathroom refit all-in (UK guides £5-10k 2026)','2026-10-11'),
  ('BATH-PREMIUM','Bathroom refit — premium','project','Bathrooms','job',1500000,null,'Premium bathroom refit all-in (UK guides £10-20k 2026)','2026-10-11')
on conflict (code) do update set
  name=excluded.name, category=excluded.category, trade_category=excluded.trade_category, unit=excluded.unit,
  base_unit_cost_pence=excluded.base_unit_cost_pence, coverage_m2_per_litre=excluded.coverage_m2_per_litre,
  source=excluded.source, priced_on=excluded.priced_on, active=true;

insert into public.quote_templates
  (tenant_id, key, name, summary, trade_category, project_type, engine_key, inputs_schema, version, active, basis)
values
  (null,'full_renovation','Full renovation','Guideline whole-house refurb cost by area and scope, broken into stages.','Full renovations','full_renovation','full_renovation',
   '[{"key":"area_m2","label":"Property floor area","unit":"m2","type":"number","default":90,"hint":"Total internal floor area being renovated."},{"key":"scope_tier","label":"Scope","type":"select","options":[{"value":"light","label":"Light refresh"},{"value":"standard","label":"Standard refurb"},{"value":"full_gut","label":"Full gut (rewire/replumb)"}],"default":"standard"},{"key":"margin_percent","label":"Add margin %","unit":"%","type":"number","default":0}]'::jsonb,
   1,true,'indicative'),
  (null,'bathroom_refit','Bathroom refit','Guideline bathroom cost by tier, broken into stages.','Bathrooms','bathroom','bathroom_refit',
   '[{"key":"tier","label":"Specification","type":"select","options":[{"value":"budget","label":"Budget"},{"value":"mid","label":"Mid-range"},{"value":"premium","label":"Premium"}],"default":"mid"},{"key":"margin_percent","label":"Add margin %","unit":"%","type":"number","default":0}]'::jsonb,
   1,true,'indicative')
on conflict (key) do update set
  name=excluded.name, summary=excluded.summary, trade_category=excluded.trade_category, project_type=excluded.project_type,
  engine_key=excluded.engine_key, inputs_schema=excluded.inputs_schema, basis=excluded.basis,
  version=public.quote_templates.version + 1, active=true;
