-- =========================================================================
-- Builders Ready — Migration 40: Indicative guidelines — Extension + Loft
-- =========================================================================
-- Single-storey extension (£/m² by spec tier) and loft conversion (by type),
-- each split into stage allowances the builder refines. basis='indicative'
-- so the UI shows a ±20% range + "refine before sending". Stage splits live
-- in @br/shared (EXTENSION_STAGES / LOFT_STAGES). Rates are all-in UK
-- benchmark figures, ex-VAT, cited.
-- =========================================================================
insert into public.material_items
  (code, name, category, trade_category, unit, base_unit_cost_pence, coverage_m2_per_litre, source, priced_on)
values
  ('EXT-BASIC','Single-storey extension — basic spec','project','Extensions','m²',160000,null,'Build rate £/m² all-in, basic spec (UK guides £1,200-1,900/m² 2026)','2026-10-11'),
  ('EXT-STANDARD','Single-storey extension — standard spec','project','Extensions','m²',210000,null,'Build rate £/m² all-in, standard spec (UK guides £1,800-2,600/m² 2026)','2026-10-11'),
  ('EXT-PREMIUM','Single-storey extension — premium spec','project','Extensions','m²',300000,null,'Build rate £/m² all-in, premium spec (UK guides £2,500-4,500/m² 2026)','2026-10-11'),
  ('LOFT-ROOFLIGHT','Loft — rooflight (Velux) conversion','project','Loft conversions','job',2600000,null,'Rooflight loft all-in (UK guides £20-38k 2026)','2026-10-11'),
  ('LOFT-DORMER','Loft — rear dormer conversion','project','Loft conversions','job',4800000,null,'Dormer loft all-in (UK guides £40-60k 2026)','2026-10-11'),
  ('LOFT-HIP-GABLE','Loft — hip-to-gable conversion','project','Loft conversions','job',6200000,null,'Hip-to-gable loft all-in (UK guides £50-70k 2026)','2026-10-11'),
  ('LOFT-MANSARD','Loft — mansard conversion','project','Loft conversions','job',8500000,null,'Mansard loft all-in (UK guides £60-125k 2026)','2026-10-11'),
  ('LOFT-ENSUITE','Ensuite bathroom (loft)','project','Loft conversions','job',800000,null,'Ensuite add-on (UK guides £5-12k 2026)','2026-10-11')
on conflict (code) do update set
  name=excluded.name, category=excluded.category, trade_category=excluded.trade_category, unit=excluded.unit,
  base_unit_cost_pence=excluded.base_unit_cost_pence, coverage_m2_per_litre=excluded.coverage_m2_per_litre,
  source=excluded.source, priced_on=excluded.priced_on, active=true;

insert into public.quote_templates
  (tenant_id, key, name, summary, trade_category, project_type, engine_key, inputs_schema, version, active, basis)
values
  (null,'extension_single_storey','Single-storey extension','Guideline build cost by floor area and spec, broken into stages.','Extensions','extension','extension_single_storey',
   '[{"key":"area_m2","label":"Floor area","unit":"m2","type":"number","default":25,"hint":"Internal floor area of the extension."},{"key":"spec_tier","label":"Specification","type":"select","options":[{"value":"basic","label":"Basic"},{"value":"standard","label":"Standard"},{"value":"premium","label":"Premium"}],"default":"standard"},{"key":"margin_percent","label":"Add margin %","unit":"%","type":"number","default":0,"hint":"Build rate is all-in; add a margin only if quoting over it."}]'::jsonb,
   1,true,'indicative'),
  (null,'loft_conversion','Loft conversion','Guideline cost by loft type, broken into stages.','Loft conversions','loft','loft_conversion',
   '[{"key":"loft_type","label":"Loft type","type":"select","options":[{"value":"rooflight","label":"Rooflight (Velux)"},{"value":"dormer","label":"Rear dormer"},{"value":"hip_to_gable","label":"Hip-to-gable"},{"value":"mansard","label":"Mansard"}],"default":"dormer"},{"key":"ensuite","label":"Include an ensuite?","type":"bool","default":false},{"key":"margin_percent","label":"Add margin %","unit":"%","type":"number","default":0}]'::jsonb,
   1,true,'indicative')
on conflict (key) do update set
  name=excluded.name, summary=excluded.summary, trade_category=excluded.trade_category, project_type=excluded.project_type,
  engine_key=excluded.engine_key, inputs_schema=excluded.inputs_schema, basis=excluded.basis,
  version=public.quote_templates.version + 1, active=true;
