-- =========================================================================
-- Builders Ready — Migration 38: Quote template — Bricklaying (measured)
-- =========================================================================
-- Brick/block walls priced by face area; single / cavity / double.
-- Quantities (60 bricks/m² single, 120 double; 10 blocks/m²) + bricklayer
-- output live in @br/shared (BRICKLAYING_ASSUMPTIONS). Prices ex-VAT, cited.
-- =========================================================================
insert into public.material_items
  (code, name, category, trade_category, unit, base_unit_cost_pence, coverage_m2_per_litre, source, priced_on)
values
  ('BRICK-FACING','Facing brick','brick','Bricklaying','brick',60,null,
   'Machine-made facing brick ~£600/1000 ex-VAT (£400-900/1000; Brickseeker/Checkatrade 2026)','2026-10-11'),
  ('BLOCK-DENSE','Dense concrete block (100mm)','brick','Bricklaying','block',150,null,
   'Dense concrete block 440x215x100, UK merchant ex-VAT','2026-10-11'),
  ('BRICK-MORTAR','Sand & cement mortar','brick','Bricklaying','m²',450,null,
   'Mortar (sand+cement) allowance per m² of wall face; editable','2026-10-11'),
  ('BRICK-SUNDRIES','Wall ties, DPC & starters','sundries','Bricklaying','m²',150,null,
   'Brickwork sundries allowance per m² (ties, DPC, profiles); editable','2026-10-11')
on conflict (code) do update set
  name=excluded.name, category=excluded.category, trade_category=excluded.trade_category, unit=excluded.unit,
  base_unit_cost_pence=excluded.base_unit_cost_pence, coverage_m2_per_litre=excluded.coverage_m2_per_litre,
  source=excluded.source, priced_on=excluded.priced_on, active=true;

insert into public.labour_rates (trade, unit, base_rate_pence, source, priced_on)
values ('bricklayer','day',28000,
   'UK bricklayer day rate, national planning average (£240-320; Checkatrade 2026). Set your own.','2026-10-11')
on conflict (trade, unit) do update set
  base_rate_pence=excluded.base_rate_pence, source=excluded.source, priced_on=excluded.priced_on, active=true;

insert into public.quote_templates
  (tenant_id, key, name, summary, trade_category, project_type, engine_key, inputs_schema, version, active, basis)
values
  (null,'bricklaying','Bricklaying','Brick or block walls priced by face area.',
   'Bricklaying',null,'bricklaying',
   '[{"key":"area_m2","label":"Wall face area","unit":"m2","type":"number","default":10,"hint":"Length x height of the wall face."},{"key":"wall_type","label":"Wall type","type":"select","options":[{"value":"single","label":"Single skin (half brick)"},{"value":"cavity","label":"Cavity (brick + block)"},{"value":"double","label":"One-brick (double)"}],"default":"single"},{"key":"margin_percent","label":"Your margin","unit":"%","type":"number","default":20}]'::jsonb,
   1,true,'measured')
on conflict (key) do update set
  name=excluded.name, summary=excluded.summary, trade_category=excluded.trade_category, project_type=excluded.project_type,
  engine_key=excluded.engine_key, inputs_schema=excluded.inputs_schema, basis=excluded.basis,
  version=public.quote_templates.version + 1, active=true;
