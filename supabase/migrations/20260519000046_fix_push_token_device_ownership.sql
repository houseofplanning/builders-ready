-- =========================================================================
-- Migration 46: fix cross-account push-notification leak
-- =========================================================================
-- A device's Expo push token was keyed by (user_id, expo_token), so every
-- account that ever signed in on a phone left its own row behind. send_push
-- delivers to every token row for the recipient, so a push to user B reached
-- any device where B had once registered — even a phone now used by someone
-- else. Fix: a device token must belong to exactly ONE user (the most recent
-- registrant). We purge the ambiguous tokens and add a BEFORE INSERT trigger
-- that releases a token from its prior owner whenever it is re-registered.
-- Works for the already-deployed app (no client change needed).
-- =========================================================================

-- 1. Purge every token that is currently shared across more than one user.
--    These are tangled test-device registrations; deleting them means no
--    wrong pushes, and each real device re-registers cleanly on next launch.
delete from public.push_tokens pt
using (
  select expo_token
  from public.push_tokens
  group by expo_token
  having count(distinct user_id) > 1
) dup
where pt.expo_token = dup.expo_token;

-- 2. Single-owner-per-device going forward: before a registration row is
--    inserted, release the token from any previous owner on that device.
create or replace function public.push_tokens_claim_device()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_tokens where expo_token = new.expo_token;
  return new;
end $$;

drop trigger if exists push_tokens_claim on public.push_tokens;
create trigger push_tokens_claim
  before insert on public.push_tokens
  for each row execute function public.push_tokens_claim_device();
