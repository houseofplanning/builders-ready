-- Project type / stage template.
--
-- The stage-template key chosen at quote or project creation (see
-- PROJECT_TEMPLATES in @br/shared). Seeds the timeline so smaller trades get a
-- short template and big builds get the full one. Nullable; null is treated as
-- the default full-renovation template.

alter table public.projects
  add column if not exists project_type text;

alter table public.estimates
  add column if not exists project_type text;

comment on column public.projects.project_type is
  'Stage-template key (PROJECT_TEMPLATES) chosen at creation. Null = default.';
comment on column public.estimates.project_type is
  'Stage-template key carried to the project when this quote converts.';
