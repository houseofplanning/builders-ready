-- =========================================================================
-- Builders Ready — Migration 37: Quote template — Flooring (measured)
-- =========================================================================
-- Laminate / LVT / engineered wood priced by area, optional underlay.
-- Fitter productivity (~18 m²/day click) in @br/shared (FLOORING_ASSUMPTIONS).
-- Prices ex-VAT, material-only, cited. Engine 'flooring'.
-- =========================================================================
insert into public.material_items
  (code, name, category, trade_category, unit, base_unit_cost_pence, coverage_m2_per_litre, source, priced_on)
values
  ('FLOOR-LAMINATE','Laminate flooring','floor','Flooring','m²',1400,null,
   'Laminate boards, UK retailers material-only ex-VAT (£10-25/m²)','2026-10-11'),
  ('FLOOR-LVT','LVT flooring','floor','Flooring','m²',2400,null,
   'Luxury vinyl tile, UK retailers material-only ex-VAT (£15-35/m²)','2026-10-11'),
  ('FLOOR-ENGINEERED','Engineered wood flooring','floor','Flooring','m²',4000,null,
   'Engineered wood, UK retailers material-only ex-VAT (£25-55/m²)','2026-10-11'),
  ('FLOOR-UNDERLAY','Underlay','floor','Flooring','m²',500,null,
   'Wood/laminate underlay ex-VAT (£4-10/m²; some click laminate has it attached)','2026-10-11'),
  ('FLOOR-SUNDRIES','Beading, trims, threshold & fixings','sundries','Flooring','m²',300,null,
   'Flooring sundries allowance per m² (scotia/beading, thresholds, fixings); editable','2026-10-11')
on conflict (code) do update set
  name=excluded.name, category=excluded.category, trade_category=excluded.trade_category, unit=excluded.unit,
  base_unit_cost_pence=excluded.base_unit_cost_pence, coverage_m2_per_litre=excluded.coverage_m2_per_litre,
  source=excluded.source, priced_on=excluded.priced_on, active=true;

insert into public.labour_rates (trade, unit, base_rate_pence, source, priced_on)
values ('floor_fitter','day',22000,
   'UK floor fitter day rate, national planning average (£150-300; Pricing Penguin/HaMuch 2026). Set your own.','2026-10-11')
on conflict (trade, unit) do update set
  base_rate_pence=excluded.base_rate_pence, source=excluded.source, priced_on=excluded.priced_on, active=true;

insert into public.quote_templates
  (tenant_id, key, name, summary, trade_category, project_type, engine_key, inputs_schema, version, active, basis)
values
  (null,'flooring','Flooring','Laminate, LVT or engineered wood priced by area.',
   'Flooring',null,'flooring',
   '[{"key":"area_m2","label":"Floor area","unit":"m2","type":"number","default":15,"hint":"Length x width per room, summed."},{"key":"floor_type","label":"Flooring type","type":"select","options":[{"value":"laminate","label":"Laminate"},{"value":"lvt","label":"LVT"},{"value":"engineered","label":"Engineered wood"}],"default":"laminate"},{"key":"underlay","label":"Include underlay?","type":"bool","default":true},{"key":"margin_percent","label":"Your margin","unit":"%","type":"number","default":20}]'::jsonb,
   1,true,'measured')
on conflict (key) do update set
  name=excluded.name, summary=excluded.summary, trade_category=excluded.trade_category, project_type=excluded.project_type,
  engine_key=excluded.engine_key, inputs_schema=excluded.inputs_schema, basis=excluded.basis,
  version=public.quote_templates.version + 1, active=true;
