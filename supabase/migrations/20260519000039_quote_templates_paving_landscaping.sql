-- =========================================================================
-- Builders Ready — Migration 39: Quote templates — Paving + Landscaping
-- =========================================================================
-- Measured, area/length-driven: Driveways & paving (block/resin/concrete,
-- optional sub-base), Fencing (per metre, 3 types), Turfing (per m², optional
-- prep), Decking (softwood/composite). Quantities + crew output live in
-- @br/shared (PAVING/FENCING/TURFING/DECKING_ASSUMPTIONS). Prices ex-VAT, cited.
-- =========================================================================
insert into public.material_items
  (code, name, category, trade_category, unit, base_unit_cost_pence, coverage_m2_per_litre, source, priced_on)
values
  ('PAVE-BLOCK','Block paving blocks & sand','paving','Driveways & paving','m²',2500,null,'Concrete block paving material ex-VAT (fitted £70-120/m²)','2026-10-11'),
  ('PAVE-RESIN','Resin & aggregate','paving','Driveways & paving','m²',3000,null,'Resin-bound material ex-VAT (fitted £40-70/m² over base)','2026-10-11'),
  ('PAVE-CONCRETE','Concrete & mesh','paving','Driveways & paving','m²',1800,null,'Concrete + mesh material ex-VAT','2026-10-11'),
  ('PAVE-SUBBASE','MOT Type 1 sub-base & membrane','paving','Driveways & paving','m²',1500,null,'MOT Type 1 + membrane per m² (adds ~£22-40/m²; paving guides)','2026-10-11'),
  ('PAVE-SUNDRIES','Edgings, bedding sand & sundries','sundries','Driveways & paving','m²',500,null,'Edgings, kiln sand, jointing allowance; editable','2026-10-11'),
  ('FENCE-LAP','Lap panels & timber posts','fencing','Landscaping & gardens','m',3500,null,'Lap panel + timber posts per m ex-VAT (fitted £55-85/m)','2026-10-11'),
  ('FENCE-CLOSEBOARD','Closeboard, concrete posts & gravel boards','fencing','Landscaping & gardens','m',5000,null,'Closeboard + concrete posts + gravel board per m ex-VAT (fitted £100-155/m)','2026-10-11'),
  ('FENCE-COMPOSITE','Composite fence panels & posts','fencing','Landscaping & gardens','m',9000,null,'Composite fencing per m ex-VAT (fitted £120-200/m)','2026-10-11'),
  ('FENCE-SUNDRIES','Postcrete, fixings & caps','sundries','Landscaping & gardens','m',500,null,'Postcrete, fixings, post caps allowance per m; editable','2026-10-11'),
  ('TURF-ROLL','Turf rolls','turf','Landscaping & gardens','m²',500,null,'Turf ex-VAT (£3-8/m²; Checkatrade/MyJobQuote)','2026-10-11'),
  ('TURF-TOPSOIL','Topsoil','turf','Landscaping & gardens','m²',600,null,'Topsoil for ground prep ex-VAT (£4-10/m²)','2026-10-11'),
  ('DECK-SOFTWOOD','Softwood decking & joists','decking','Landscaping & gardens','m²',4500,null,'Softwood boards + frame material ex-VAT (fitted £80-140/m²)','2026-10-11'),
  ('DECK-COMPOSITE','Composite decking & joists','decking','Landscaping & gardens','m²',8500,null,'Composite boards + frame material ex-VAT (fitted £120-220/m²)','2026-10-11'),
  ('DECK-SUNDRIES','Deck fixings, posts & sundries','sundries','Landscaping & gardens','m²',800,null,'Fixings, posts, joist hangers allowance per m²; editable','2026-10-11')
on conflict (code) do update set
  name=excluded.name, category=excluded.category, trade_category=excluded.trade_category, unit=excluded.unit,
  base_unit_cost_pence=excluded.base_unit_cost_pence, coverage_m2_per_litre=excluded.coverage_m2_per_litre,
  source=excluded.source, priced_on=excluded.priced_on, active=true;

insert into public.labour_rates (trade, unit, base_rate_pence, source, priced_on)
values
  ('groundworker','day',30000,'Groundwork/paving 2-person team day rate (£240-350; paving guides). Set your own.','2026-10-11'),
  ('fencer','day',22000,'Fencer day rate (labour £25-50/m; fencing guides). Set your own.','2026-10-11'),
  ('landscaper','day',20000,'Landscaper/gardener day rate. Set your own.','2026-10-11')
on conflict (trade, unit) do update set
  base_rate_pence=excluded.base_rate_pence, source=excluded.source, priced_on=excluded.priced_on, active=true;

insert into public.quote_templates
  (tenant_id, key, name, summary, trade_category, project_type, engine_key, inputs_schema, version, active, basis)
values
  (null,'paving','Driveways & paving','Block, resin or concrete priced by area.','Driveways & paving',null,'paving',
   '[{"key":"area_m2","label":"Area","unit":"m2","type":"number","default":40,"hint":"Driveway/patio area (length x width)."},{"key":"surface_type","label":"Surface","type":"select","options":[{"value":"block","label":"Block paving"},{"value":"resin","label":"Resin-bound"},{"value":"concrete","label":"Concrete"}],"default":"block"},{"key":"new_subbase","label":"New sub-base needed?","type":"bool","default":true},{"key":"margin_percent","label":"Your margin","unit":"%","type":"number","default":20}]'::jsonb,
   1,true,'measured'),
  (null,'fencing','Fencing','Timber or composite fencing priced by the metre.','Landscaping & gardens',null,'fencing',
   '[{"key":"length_m","label":"Fence length","unit":"m","type":"number","default":10,"hint":"Total run of fencing."},{"key":"fence_type","label":"Fence type","type":"select","options":[{"value":"lap_timber","label":"Lap panel + timber posts"},{"value":"closeboard_concrete","label":"Closeboard + concrete posts"},{"value":"composite","label":"Composite"}],"default":"lap_timber"},{"key":"margin_percent","label":"Your margin","unit":"%","type":"number","default":20}]'::jsonb,
   1,true,'measured'),
  (null,'turfing','Turfing / new lawn','Supply & lay turf, priced by area.','Landscaping & gardens',null,'turfing',
   '[{"key":"area_m2","label":"Lawn area","unit":"m2","type":"number","default":50,"hint":"Area to turf."},{"key":"ground_prep","label":"Ground prep (old lawn + topsoil)?","type":"bool","default":true},{"key":"margin_percent","label":"Your margin","unit":"%","type":"number","default":20}]'::jsonb,
   1,true,'measured'),
  (null,'decking','Decking','Softwood or composite decking priced by area.','Landscaping & gardens',null,'decking',
   '[{"key":"area_m2","label":"Deck area","unit":"m2","type":"number","default":15,"hint":"Deck area (length x width)."},{"key":"deck_type","label":"Decking type","type":"select","options":[{"value":"softwood","label":"Softwood"},{"value":"composite","label":"Composite"}],"default":"softwood"},{"key":"margin_percent","label":"Your margin","unit":"%","type":"number","default":20}]'::jsonb,
   1,true,'measured')
on conflict (key) do update set
  name=excluded.name, summary=excluded.summary, trade_category=excluded.trade_category, project_type=excluded.project_type,
  engine_key=excluded.engine_key, inputs_schema=excluded.inputs_schema, basis=excluded.basis,
  version=public.quote_templates.version + 1, active=true;
