-- Let a marketplace customer (project client with NO tenant membership) decide
-- decisions and sign variations on their own project. Mirrors the client-read
-- fix: the client branch no longer requires a tenant match. Invited clients
-- (who are also client_id) keep working. with-check stays decided_by = me.

drop policy if exists decisions_client_decide on public.decisions;
create policy decisions_client_decide on public.decisions
  for update using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id and pr.client_id = auth.uid()
    )
  ) with check (decided_by = auth.uid());

drop policy if exists variations_client_decide on public.variations;
create policy variations_client_decide on public.variations
  for update using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id and pr.client_id = auth.uid()
    )
  ) with check (decided_by = auth.uid());
