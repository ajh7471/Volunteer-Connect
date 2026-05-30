-- 031a_org_id_backstop_triggers.sql
-- HOTFIX to merged 031: org_id NOT NULL broke application-layer inserts that
-- never set org_id (Codex PR #36 finding P1, SQLSTATE 23502). This adds
-- BEFORE INSERT backstop triggers that auto-derive org_id from the row's
-- parent/owner ONLY when the caller omitted it (NEW.org_id IS NULL), so explicit
-- values from app code or the patched Phase 1 functions are always respected.
--
-- Apply AFTER 000_baseline_schema.sql and 031_multitenancy_core.sql.
-- STAGING ONLY (tgioxwjxxppjsjernhvt). Production migration is Phase 9.
--
-- ============================================================================
-- SERVICE-ROLE VERIFICATION (per owner mandate, 2026-05-29) — which app insert
-- paths carry auth.uid() (backstop can derive) vs run under the service-role
-- client (auth.uid() NULL — backstop CANNOT derive; must NOT silently mis-fill):
--
--   from_shift  (derive from NEW.shift_id -> shifts.org_id; client-independent):
--     shift_assignments, shift_waitlist, emergency_coverage_requests          OK
--   from_user   (derive from NEW.user_id -> profiles.org_id; client-independent):
--     notification_queue, user_sessions                                       OK
--   from_actor  (derive from auth.uid() -> profiles.org_id; SESSION clients only):
--     email_logs, email_templates, scheduled_emails, shift_templates,
--     email_service_config         -> all verified SESSION-context inserts      OK
--
--   shifts      -> EXCLUDED. Its inserts (app/admin/actions.ts bulkCreateShifts,
--                  createSingleShift) use the SERVICE-ROLE client, so auth.uid()
--                  is NULL and there is no parent FK to derive from. Backstopping
--                  it would silently mis-fill. The correct fix is the app caller
--                  passing org_id explicitly (Phase 3 multi-tenant app wiring).
--                  Until then shifts.org_id must be supplied by the inserter
--                  (apply_shift_template / seed_shifts_range already do).
-- ============================================================================

-- ---- backstop functions (SECURITY DEFINER + pinned search_path, per 031 hardening) ----

-- Derive org_id from the referenced shift. For: shift_assignments, shift_waitlist,
-- emergency_coverage_requests. Works under any client (row lookup, no auth).
create or replace function public.backstop_org_id_from_shift()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if new.org_id is null then
    select s.org_id into new.org_id from public.shifts s where s.id = new.shift_id;
  end if;
  return new;
end;
$function$;

-- Derive org_id from the row's user (profiles). For: notification_queue,
-- user_sessions. Works under any client (row lookup, no auth).
create or replace function public.backstop_org_id_from_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if new.org_id is null then
    select p.org_id into new.org_id from public.profiles p where p.id = new.user_id;
  end if;
  return new;
end;
$function$;

-- Derive org_id from the acting (authenticated) user. For the admin/email tables
-- whose inserts run under the cookie-session client (auth.uid() present, verified).
-- Intentionally NOT used for shifts (service-role inserts; see header).
create or replace function public.backstop_org_id_from_actor()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if new.org_id is null then
    select p.org_id into new.org_id from public.profiles p where p.id = auth.uid();
  end if;
  return new;
end;
$function$;

-- ---- triggers (idempotent: drop-if-exists then create) ----

-- from_shift
drop trigger if exists trg_backstop_org_id on public.shift_assignments;
create trigger trg_backstop_org_id before insert on public.shift_assignments
  for each row execute function public.backstop_org_id_from_shift();

drop trigger if exists trg_backstop_org_id on public.shift_waitlist;
create trigger trg_backstop_org_id before insert on public.shift_waitlist
  for each row execute function public.backstop_org_id_from_shift();

drop trigger if exists trg_backstop_org_id on public.emergency_coverage_requests;
create trigger trg_backstop_org_id before insert on public.emergency_coverage_requests
  for each row execute function public.backstop_org_id_from_shift();

-- from_user
drop trigger if exists trg_backstop_org_id on public.notification_queue;
create trigger trg_backstop_org_id before insert on public.notification_queue
  for each row execute function public.backstop_org_id_from_user();

drop trigger if exists trg_backstop_org_id on public.user_sessions;
create trigger trg_backstop_org_id before insert on public.user_sessions
  for each row execute function public.backstop_org_id_from_user();

-- from_actor (session-context tables only)
drop trigger if exists trg_backstop_org_id on public.email_logs;
create trigger trg_backstop_org_id before insert on public.email_logs
  for each row execute function public.backstop_org_id_from_actor();

drop trigger if exists trg_backstop_org_id on public.email_templates;
create trigger trg_backstop_org_id before insert on public.email_templates
  for each row execute function public.backstop_org_id_from_actor();

drop trigger if exists trg_backstop_org_id on public.scheduled_emails;
create trigger trg_backstop_org_id before insert on public.scheduled_emails
  for each row execute function public.backstop_org_id_from_actor();

drop trigger if exists trg_backstop_org_id on public.shift_templates;
create trigger trg_backstop_org_id before insert on public.shift_templates
  for each row execute function public.backstop_org_id_from_actor();

drop trigger if exists trg_backstop_org_id on public.email_service_config;
create trigger trg_backstop_org_id before insert on public.email_service_config
  for each row execute function public.backstop_org_id_from_actor();

-- NOTE: public.shifts intentionally has NO backstop trigger (service-role inserts;
-- see header). Tracked for the Phase 3 app-caller fix.
