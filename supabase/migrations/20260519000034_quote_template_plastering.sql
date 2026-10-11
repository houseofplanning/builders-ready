-- =========================================================================
-- Builders Ready — Migration 34: Quote template — Plastering / skimming
-- =========================================================================
-- Second trade for Quote Templates v2. Prices ex-VAT, cited; physical
-- coverage + plasterer productivity live as documented constants in
-- @br/shared (PLASTERING_ASSUMPTIONS). Engine key 'plastering'.
-- =========================================================================
insert into public.material_items
  (code, name, category, trade_category, unit, base_unit_cost_pence, coverage_m2_per_litre, source, priced_on)
values
  ('PLASTER-MULTIFINISH','Multi-finish skim plaster (25kg)','plaster','Plastering','bag',1092,null,
   'British Gypsum Thistle MultiFinish 25kg, Travis Perkins ex-VAT (~10 m2/bag @ 2mm)','2026-10-11'),
  ('PLASTER-BONDING','Bonding undercoat plaster (25kg)','plaster','Plastering','bag',1100,null,
   'British Gypsum Thistle Bonding 25kg, UK merchant ex-VAT (~2.75 m2/bag @ 11mm)','2026-10-11'),
  ('PLASTERBOARD-STD','Plasterboard 12.5mm (2.4x1.2m)','plaster','Plastering','board',800,null,
   'Gyproc wallboard 2400x1200x12.5mm, UK merchant ex-VAT (2.88 m2/board)','2026-10-11'),
  ('PLASTER-SUNDRIES','Plastering sundries (PVA, scrim, beads)','sundries','Plastering','m2',150,null,
   'Trade sundries allowance per m2 (PVA, scrim tape, beads); editable','2026-10-11')
on conflict (code) do update set
  name=excluded.name, category=excluded.category, trade_category=excluded.trade_category, unit=excluded.unit,
  base_unit_cost_pence=excluded.base_unit_cost_pence, coverage_m2_per_litre=excluded.coverage_m2_per_litre,
  source=excluded.source, priced_on=excluded.priced_on, active=true;

insert into public.labour_rates (trade, unit, base_rate_pence, source, priced_on)
values ('plasterer','day',20000,
   'UK plasterer day rate, national planning average (Checkatrade ~£300; national £150-£300). Set your own.','2026-10-11')
on conflict (trade, unit) do update set
  base_rate_pence=excluded.base_rate_pence, source=excluded.source, priced_on=excluded.priced_on, active=true;

insert into public.quote_templates
  (tenant_id, key, name, summary, trade_category, project_type, engine_key, inputs_schema, version, active)
values
  (null,'plastering','Plastering / skimming',
   'Skim, board & skim, or re-plaster bare walls - priced by area.',
   'Plastering','plastering','plastering',
   '[{"key":"area_m2","label":"Area to plaster","unit":"m2","type":"number","default":30,"hint":"Total wall + ceiling area. Tip: wall = perimeter x height."},{"key":"job_type","label":"Type of work","type":"select","options":[{"value":"skim","label":"Skim over existing"},{"value":"board_and_skim","label":"Board & skim"},{"value":"reskim_bare","label":"Re-plaster bare walls"}],"default":"skim"},{"key":"margin_percent","label":"Your margin","unit":"%","type":"number","default":20}]'::jsonb,
   1,true)
on conflict (key) do update set
  name=excluded.name, summary=excluded.summary, trade_category=excluded.trade_category, project_type=excluded.project_type,
  engine_key=excluded.engine_key, inputs_schema=excluded.inputs_schema,
  version=public.quote_templates.version + 1, active=true;
