-- =========================================================================
-- Builders Ready — Migration 36: Quote template — Tiling (measured)
-- =========================================================================
-- Wall/floor tiling priced by area; tiles tiered (budget/mid/premium).
-- Adhesive coverage ~4 m²/20kg bag + tiler productivity live in @br/shared
-- (TILING_ASSUMPTIONS). Prices ex-VAT, cited. Engine 'tiling'.
-- =========================================================================
insert into public.material_items
  (code, name, category, trade_category, unit, base_unit_cost_pence, coverage_m2_per_litre, source, priced_on)
values
  ('TILE-BUDGET','Ceramic / basic porcelain tiles','tile','Tiling','m²',1800,null,
   'Budget ceramic/porcelain, UK retailers ex-VAT (£8-32/m²)','2026-10-11'),
  ('TILE-MID','Porcelain tiles (mid-range)','tile','Tiling','m²',3500,null,
   'Mid porcelain (stone/concrete-effect), UK retailers ex-VAT (£33-45/m²)','2026-10-11'),
  ('TILE-PREMIUM','Porcelain tiles (premium / large-format)','tile','Tiling','m²',7000,null,
   'Premium/large-format porcelain, UK retailers ex-VAT (£70-150/m²)','2026-10-11'),
  ('TILE-ADHESIVE','Flexible tile adhesive (20kg)','tile','Tiling','bag',1200,null,
   'Flexible S1 adhesive 20kg, UK merchant ex-VAT (~4 m²/bag; Mapei/BAL)','2026-10-11'),
  ('TILE-SUNDRIES','Grout, spacers, trims & sealant','sundries','Tiling','m²',350,null,
   'Tiling sundries allowance per m² (grout, spacers, trims, sealant); editable','2026-10-11')
on conflict (code) do update set
  name=excluded.name, category=excluded.category, trade_category=excluded.trade_category, unit=excluded.unit,
  base_unit_cost_pence=excluded.base_unit_cost_pence, coverage_m2_per_litre=excluded.coverage_m2_per_litre,
  source=excluded.source, priced_on=excluded.priced_on, active=true;

insert into public.labour_rates (trade, unit, base_rate_pence, source, priced_on)
values ('tiler','day',22000,
   'UK tiler day rate, national planning average (£200-300; fmms/Checkatrade 2026). Set your own.','2026-10-11')
on conflict (trade, unit) do update set
  base_rate_pence=excluded.base_rate_pence, source=excluded.source, priced_on=excluded.priced_on, active=true;

insert into public.quote_templates
  (tenant_id, key, name, summary, trade_category, project_type, engine_key, inputs_schema, version, active, basis)
values
  (null,'tiling','Tiling','Wall or floor tiling priced by area, tiles by tier.',
   'Tiling',null,'tiling',
   '[{"key":"area_m2","label":"Area to tile","unit":"m2","type":"number","default":10,"hint":"Wall or floor area. Walls: perimeter tiled x height."},{"key":"surface","label":"Surface","type":"select","options":[{"value":"wall","label":"Walls"},{"value":"floor","label":"Floor"}],"default":"wall"},{"key":"tile_tier","label":"Tile quality","type":"select","options":[{"value":"budget","label":"Budget"},{"value":"mid","label":"Mid-range"},{"value":"premium","label":"Premium / large-format"}],"default":"mid"},{"key":"margin_percent","label":"Your margin","unit":"%","type":"number","default":20}]'::jsonb,
   1,true,'measured')
on conflict (key) do update set
  name=excluded.name, summary=excluded.summary, trade_category=excluded.trade_category, project_type=excluded.project_type,
  engine_key=excluded.engine_key, inputs_schema=excluded.inputs_schema, basis=excluded.basis,
  version=public.quote_templates.version + 1, active=true;
