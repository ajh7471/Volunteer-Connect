-- 031_multitenancy_core.sql
-- Phase 1 — multitenancy core: tenant entity + org_id on every tenant table.
--
-- Locked decisions (MIGRATION_NOTES §8): scripts start at 031; NO auto-RLS event
-- trigger (RLS is explicit in Phase 2 / script 032). Classification + rulings
-- approved by owner 2026-05-29 (MIGRATION_NOTES §9 and the Phase 1 gate).
--
-- Apply ON TOP OF 000_baseline_schema.sql. STAGING ONLY (tgioxwjxxppjsjernhvt).
-- Production is never touched before Phase 9.
--
-- The applier runs this file in a single transaction (Supabase apply_migration /
-- psql --single-transaction); no explicit BEGIN/COMMIT so it is not double-wrapped.

-- ============================================================================
-- STEP 1 — tenant entity, per-tenant settings, reserved slugs, anchor seed
-- ============================================================================

-- 1. Organizations (tenants)
create table if not exists public.organizations (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique
                  check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$'),
  name          text not null,
  status        text not null default 'trialing'
                  check (status in ('trialing','active','past_due','canceled')),
  plan          text not null default 'starter'
                  check (plan in ('starter','growth','pro')),
  trial_ends_at timestamptz,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  current_period_end     timestamptz,
  created_at    timestamptz not null default now()
);

-- 2. Per-tenant branding/settings (replaces hardcoded Vanderpump references)
create table if not exists public.org_settings (
  org_id        uuid primary key references public.organizations(id) on delete cascade,
  display_name  text not null,
  logo_url      text,
  primary_color text default '#0f766e',
  support_email text,
  updated_at    timestamptz not null default now()
);

-- 3. Reserved subdomains (cannot be claimed as tenant slugs)
create table if not exists public.reserved_slugs (slug text primary key);
insert into public.reserved_slugs(slug) values
  ('www'),('app'),('api'),('admin'),('mail'),('smtp'),('ftp'),
  ('blog'),('status'),('help'),('docs'),('staging'),('dev'),('test'),('billing')
on conflict (slug) do nothing;

-- 4. Backfill the existing org as the first tenant (the Vanderpump anchor).
--    Fixed UUID …0001 is the backfill target for every tenant table in Step 2.
insert into public.organizations (id, slug, name, status, plan, trial_ends_at)
values ('00000000-0000-0000-0000-000000000001','vanderpumpdogs',
        'Vanderpump Dogs','active','pro', null)
on conflict (id) do nothing;

insert into public.org_settings (org_id, display_name, logo_url, support_email)
values ('00000000-0000-0000-0000-000000000001','Vanderpump Dogs',
        '/images/vanderpump-dogs-logo.png', null)
on conflict (org_id) do nothing;

-- ============================================================================
-- STEP 2 — org_id rollout across TENANT tables (owner-approved 2026-05-29)
--   Classification: 18 TENANT (15 NOT NULL incl. auth_blocklist; 3 NULLABLE),
--   2 GLOBAL untouched (auth_rate_limits, session_config).
--   Anchor org for all backfills: 00000000-0000-0000-0000-000000000001.
-- ============================================================================

-- ---- 5. TENANT tables — org_id NOT NULL ------------------------------------
-- Pattern: add column -> backfill anchor -> SET NOT NULL -> index.

-- profiles (the RLS join table; auth_org_id() reads profiles.org_id)
alter table public.profiles add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.profiles set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.profiles alter column org_id set not null;
create index if not exists idx_profiles_org on public.profiles(org_id);

-- shifts
alter table public.shifts add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.shifts set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.shifts alter column org_id set not null;
create index if not exists idx_shifts_org on public.shifts(org_id);

-- shift_assignments
alter table public.shift_assignments add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.shift_assignments set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.shift_assignments alter column org_id set not null;
create index if not exists idx_shift_assignments_org on public.shift_assignments(org_id);

-- shift_templates
alter table public.shift_templates add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.shift_templates set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.shift_templates alter column org_id set not null;
create index if not exists idx_shift_templates_org on public.shift_templates(org_id);

-- shift_waitlist
alter table public.shift_waitlist add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.shift_waitlist set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.shift_waitlist alter column org_id set not null;
create index if not exists idx_shift_waitlist_org on public.shift_waitlist(org_id);

-- emergency_coverage_requests
alter table public.emergency_coverage_requests add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.emergency_coverage_requests set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.emergency_coverage_requests alter column org_id set not null;
create index if not exists idx_emergency_coverage_org on public.emergency_coverage_requests(org_id);

-- email_logs
alter table public.email_logs add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.email_logs set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.email_logs alter column org_id set not null;
create index if not exists idx_email_logs_org on public.email_logs(org_id);

-- email_templates
alter table public.email_templates add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.email_templates set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.email_templates alter column org_id set not null;
create index if not exists idx_email_templates_org on public.email_templates(org_id);

-- scheduled_emails
alter table public.scheduled_emails add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.scheduled_emails set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.scheduled_emails alter column org_id set not null;
create index if not exists idx_scheduled_emails_org on public.scheduled_emails(org_id);

-- notification_queue
alter table public.notification_queue add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.notification_queue set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.notification_queue alter column org_id set not null;
create index if not exists idx_notification_queue_org on public.notification_queue(org_id);

-- notification_preferences (UNIQUE(user_id) left as-is: user is globally unique)
alter table public.notification_preferences add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.notification_preferences set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.notification_preferences alter column org_id set not null;
create index if not exists idx_notification_preferences_org on public.notification_preferences(org_id);

-- calendar_exports
alter table public.calendar_exports add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.calendar_exports set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.calendar_exports alter column org_id set not null;
create index if not exists idx_calendar_exports_org on public.calendar_exports(org_id);

-- email_service_config (holds secrets; Phase 2 RLS must be airtight)
alter table public.email_service_config add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.email_service_config set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.email_service_config alter column org_id set not null;
create index if not exists idx_email_service_config_org on public.email_service_config(org_id);

-- user_sessions (session_token stays GLOBALLY unique — not org-scoped)
alter table public.user_sessions add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.user_sessions set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.user_sessions alter column org_id set not null;
create index if not exists idx_user_sessions_org on public.user_sessions(org_id);

-- auth_blocklist (TENANT per owner ruling; PK widened (email) -> (org_id, email))
alter table public.auth_blocklist add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.auth_blocklist set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.auth_blocklist alter column org_id set not null;
alter table public.auth_blocklist drop constraint if exists auth_blocklist_pkey;
alter table public.auth_blocklist add constraint auth_blocklist_pkey primary key (org_id, email);
create index if not exists idx_auth_blocklist_org on public.auth_blocklist(org_id);

-- ---- 6. TENANT tables — org_id NULLABLE ------------------------------------
-- Nullable because these carry system / pre-auth / anonymous rows with no org.
-- Existing rows still backfilled to the anchor; column stays nullable for future
-- system rows. (security_audit_log cross-tenant read policy = Phase 2 must-fix.)

-- pwa_installations (user_id is nullable -> anonymous installs have no org)
alter table public.pwa_installations add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.pwa_installations set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
create index if not exists idx_pwa_installations_org on public.pwa_installations(org_id);

-- security_audit_log (system/pre-auth events have null user_id -> null org)
alter table public.security_audit_log add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.security_audit_log set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
create index if not exists idx_security_audit_log_org on public.security_audit_log(org_id);

-- session_events (service-written, nullable user_id)
alter table public.session_events add column if not exists org_id uuid references public.organizations(id) on delete cascade;
update public.session_events set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
create index if not exists idx_session_events_org on public.session_events(org_id);

-- ---- 7. Re-scope UNIQUE keys that would collide across orgs (Trap 1) --------

-- shifts: UNIQUE(shift_date, slot) + duplicate unique index -> (org_id, shift_date, slot)
alter table public.shifts drop constraint if exists shifts_shift_date_slot_key;
drop index if exists public.ux_shifts_date_slot;
alter table public.shifts add constraint shifts_org_date_slot_key unique (org_id, shift_date, slot);

-- shift_templates: UNIQUE(name) -> (org_id, name)
alter table public.shift_templates drop constraint if exists shift_templates_name_key;
alter table public.shift_templates add constraint shift_templates_org_name_key unique (org_id, name);

-- email_service_config: UNIQUE(service_name) -> (org_id, service_name)
alter table public.email_service_config drop constraint if exists email_service_config_service_name_key;
alter table public.email_service_config add constraint email_service_config_org_service_name_key unique (org_id, service_name);

-- shift_assignments: (shift_id, user_id) -> (org_id, shift_id, user_id)
alter table public.shift_assignments drop constraint if exists shift_assignments_shift_id_user_id_key;
alter table public.shift_assignments add constraint shift_assignments_org_shift_user_key unique (org_id, shift_id, user_id);

-- shift_waitlist: (shift_id, user_id) -> (org_id, shift_id, user_id)
alter table public.shift_waitlist drop constraint if exists shift_waitlist_shift_id_user_id_key;
alter table public.shift_waitlist add constraint shift_waitlist_org_shift_user_key unique (org_id, shift_id, user_id);

-- profiles PK (id) and notification_preferences UNIQUE(user_id) intentionally
-- left as-is: one-user-one-org (v1) makes them already correct.

-- ---- 8. Patch SECURITY DEFINER functions to populate org_id (Trap 2) --------
-- Each derives org_id from its source row; signup paths fall back to the anchor
-- until the Phase 5 self-service signup flow supplies the real org_id.

-- handle_new_user(): on_auth_user_created -> profiles (LIVE). org_id is ALWAYS
-- the anchor org here; it NEVER reads client-supplied signup metadata (doing so
-- was a cross-tenant placement vector — ultrareview #1). Phase 5 server-side
-- provisioning sets the real org_id from a trusted subdomain signal post-signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, phone, email, email_opt_in, email_categories, role, active, org_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'name', ''),
    COALESCE(new.raw_user_meta_data ->> 'phone', ''),
    new.email,
    COALESCE((new.raw_user_meta_data ->> 'email_opt_in')::boolean, false),
    COALESCE(new.raw_user_meta_data -> 'email_categories', '{}'::jsonb),
    'volunteer',
    true,
    '00000000-0000-0000-0000-000000000001'  -- anchor only; never trust client metadata org_id
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    email = COALESCE(EXCLUDED.email, profiles.email);

  RETURN new;
END;
$function$;

-- create_notification_preferences(): AFTER INSERT ON profiles (LIVE).
-- Inherit org_id from the new profile row.
CREATE OR REPLACE FUNCTION public.create_notification_preferences()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO notification_preferences (user_id, org_id)
  VALUES (NEW.id, NEW.org_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- schedule_shift_reminder(): AFTER INSERT ON shift_assignments (LIVE).
-- notification_queue.org_id from the assignment's org_id.
CREATE OR REPLACE FUNCTION public.schedule_shift_reminder()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_reminder_hours INTEGER;
  v_scheduled_time TIMESTAMP WITH TIME ZONE;
  v_shift_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
  v_user_id := NEW.user_id;
  SELECT COALESCE(reminder_hours_before, 24) INTO v_reminder_hours
  FROM notification_preferences WHERE user_id = v_user_id;
  SELECT (shift_date || ' ' || start_time)::TIMESTAMP WITH TIME ZONE INTO v_shift_datetime
  FROM shifts WHERE id = NEW.shift_id;
  v_scheduled_time := v_shift_datetime - (v_reminder_hours || ' hours')::INTERVAL;
  IF v_scheduled_time > NOW() THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    INSERT INTO notification_queue (user_id, notification_type, shift_id, subject, body, scheduled_for, org_id)
    VALUES (v_user_id, 'shift_reminder', NEW.shift_id,
      'Reminder: Your upcoming volunteer shift',
      'This is a reminder about your volunteer shift tomorrow. We look forward to seeing you!',
      v_scheduled_time, NEW.org_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- process_waitlist(): notification_queue.org_id derived from the shift.
CREATE OR REPLACE FUNCTION public.process_waitlist(shift_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  waitlist_record RECORD;
  available_spots INTEGER;
  v_org_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM shifts WHERE id = shift_id_param;

  SELECT s.capacity - COUNT(sa.id) INTO available_spots
  FROM shifts s
  LEFT JOIN shift_assignments sa ON s.id = sa.shift_id
  WHERE s.id = shift_id_param
  GROUP BY s.capacity;

  FOR waitlist_record IN
    SELECT * FROM shift_waitlist
    WHERE shift_id = shift_id_param AND status = 'waiting'
    ORDER BY position
    LIMIT available_spots
  LOOP
    UPDATE shift_waitlist
    SET status = 'notified', notified_at = NOW(), expires_at = NOW() + INTERVAL '48 hours'
    WHERE id = waitlist_record.id;

    INSERT INTO notification_queue (user_id, shift_id, notification_type, subject, body, scheduled_for, org_id)
    VALUES (waitlist_record.user_id, shift_id_param, 'waitlist_spot_available',
      'Shift Spot Available!',
      'A spot has opened up for a shift you''re waitlisted for. You have 48 hours to claim it.',
      NOW(), v_org_id);
  END LOOP;
END;
$function$;

-- apply_shift_template(): shifts.org_id from the template; ON CONFLICT re-scoped.
CREATE OR REPLACE FUNCTION public.apply_shift_template(template_id_param uuid, start_date_param date, end_date_param date)
 RETURNS TABLE(shifts_created integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  template_record RECORD;
  current_date_var DATE;
  day_of_week INTEGER;
  shifts_count INTEGER := 0;
BEGIN
  SELECT * INTO template_record FROM shift_templates WHERE id = template_id_param AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;
  current_date_var := start_date_param;
  WHILE current_date_var <= end_date_param LOOP
    day_of_week := EXTRACT(DOW FROM current_date_var)::INTEGER;
    IF day_of_week = ANY(template_record.days_of_week) THEN
      INSERT INTO shifts (shift_date, slot, start_time, end_time, capacity, org_id)
      VALUES (current_date_var, template_record.slot, template_record.start_time, template_record.end_time, template_record.capacity, template_record.org_id)
      ON CONFLICT (org_id, shift_date, slot) DO NOTHING;
      IF FOUND THEN
        shifts_count := shifts_count + 1;
      END IF;
    END IF;
    current_date_var := current_date_var + INTERVAL '1 day';
  END LOOP;
  RETURN QUERY SELECT shifts_count;
END;
$function$;

-- seed_shifts_range(): admin seeding; shifts.org_id from the calling admin's org.
CREATE OR REPLACE FUNCTION public.seed_shifts_range(start_date date, end_date date, cap integer DEFAULT 2)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only admins can seed shifts.';
  end if;

  select org_id into v_org_id from public.profiles where id = auth.uid();

  insert into public.shifts (shift_date, slot, start_time, end_time, capacity, org_id)
  select d::date, s.slot, s.start_t, s.end_t, cap, v_org_id
  from generate_series(start_date, end_date, interval '1 day') as g(d),
       (values ('AM'::text, time '09:00', time '12:00'),
               ('MID', time '12:00', time '15:00'),
               ('PM', time '15:00', time '17:00')) as s(slot, start_t, end_t)
  where extract(dow from d::date) != 0
  on conflict (org_id, shift_date, slot) do nothing;

  insert into public.shifts (shift_date, slot, start_time, end_time, capacity, org_id)
  select d::date, s.slot, s.start_t, s.end_t, cap, v_org_id
  from generate_series(start_date, end_date, interval '1 day') as g(d),
       (values ('AM'::text, time '10:00', time '12:00'),
               ('MID', time '12:00', time '15:00'),
               ('PM', time '15:00', time '17:00')) as s(slot, start_t, end_t)
  where extract(dow from d::date) = 0
  on conflict (org_id, shift_date, slot) do nothing;
end;
$function$;

-- handle_new_user_disabled(): DORMANT (no trigger bound). Patched for safety so
-- it cannot break under NOT NULL if ever re-enabled.
CREATE OR REPLACE FUNCTION public.handle_new_user_disabled()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_name TEXT;
  user_phone TEXT;
  user_email TEXT;
  user_email_opt_in BOOLEAN;
  user_email_categories JSONB;
  v_org_id UUID;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'New Volunteer');
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  user_email := COALESCE(NEW.email, '');
  user_email_opt_in := COALESCE((NEW.raw_user_meta_data->>'email_opt_in')::boolean, false);
  user_email_categories := COALESCE(NEW.raw_user_meta_data->'email_categories', '{}'::jsonb);
  v_org_id := '00000000-0000-0000-0000-000000000001';  -- anchor only; never trust client metadata org_id

  INSERT INTO public.profiles (
    id, name, email, phone, role, email_opt_in, email_categories, active, created_at, updated_at, org_id
  ) VALUES (
    NEW.id, user_name, user_email, user_phone, 'volunteer',
    user_email_opt_in, user_email_categories, true, NOW(), NOW(), v_org_id
  );

  INSERT INTO public.notification_preferences (
    user_id, shift_reminder_24h_email, shift_reminder_1h_email, shift_confirmation_email,
    shift_cancellation_email, admin_announcements, newsletter, last_minute_coverage_push,
    shift_reminder_push, reminder_hours_before, created_at, updated_at, org_id
  ) VALUES (
    NEW.id, user_email_opt_in, user_email_opt_in, user_email_opt_in, user_email_opt_in,
    false, false, user_email_opt_in, false, 24, NOW(), NOW(), v_org_id
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$function$;
