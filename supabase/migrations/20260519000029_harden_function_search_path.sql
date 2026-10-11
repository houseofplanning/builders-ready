-- Security hardening (advisor 0011_function_search_path_mutable):
-- pin a stable search_path on the two functions that were missing one, so they
-- can't be influenced by a caller's session search_path.
alter function public.touch_updated_at() set search_path = public;
alter function public.handover_project_id(text) set search_path = public;
