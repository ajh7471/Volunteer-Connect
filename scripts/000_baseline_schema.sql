-- 000_baseline_schema.sql
-- Reconstructed baseline schema for Volunteer Connect.
-- Provenance: introspected (structure-only, NO row data) from the production
--   Supabase project on 2026-05-29 via read-only catalog queries, under a
--   one-time approved exception. Recreates what the never-committed
--   001_initial_schema.sql (+ external v0.dev/dashboard changes) produced.
-- Apply FIRST, before the numbered /scripts migrations.
-- Dependency order: extensions -> enum -> tables -> PK/UNIQUE -> FK -> CHECK
--   -> indexes -> view -> functions -> RLS -> policies -> triggers.
-- NOTE: requires the Supabase `auth` schema (auth.users) to exist (it does by default).

-- ============ EXTENSIONS ============
create extension if not exists citext;
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ============ ENUM TYPES ============
do $$ begin
  create type public.email_status as enum ('pending', 'sent', 'failed');
exception when duplicate_object then null; end $$;

-- ============ TABLES ============
CREATE TABLE IF NOT EXISTS public.auth_blocklist (
  email citext NOT NULL,
  blocked_by uuid,
  blocked_at timestamp with time zone DEFAULT now(),
  reason text
);
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  email text,
  attempt_type text NOT NULL,
  attempted_at timestamp with time zone DEFAULT now(),
  success boolean DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.calendar_exports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  export_type text NOT NULL,
  shift_ids uuid[],
  exported_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text
);
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sent_at timestamp with time zone DEFAULT now(),
  sent_by uuid,
  recipient_id uuid,
  recipient_email citext,
  email_type text,
  subject text,
  status email_status DEFAULT 'pending'::email_status,
  error_message text
);
CREATE TABLE IF NOT EXISTS public.email_service_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  is_active boolean DEFAULT false,
  priority integer DEFAULT 1,
  sendgrid_api_key text,
  sendgrid_from_email text,
  sendgrid_from_name text,
  gmail_client_id text,
  gmail_client_secret text,
  gmail_refresh_token text,
  gmail_access_token text,
  gmail_token_expiry timestamp with time zone,
  gmail_from_email text,
  is_validated boolean DEFAULT false,
  last_validated_at timestamp with time zone,
  validation_error text,
  emails_sent_count integer DEFAULT 0,
  last_email_sent_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  active boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.emergency_coverage_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  reason text,
  urgency text DEFAULT 'normal'::text,
  status text DEFAULT 'open'::text,
  filled_by uuid,
  filled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  notification_sent boolean DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shift_confirmation_email boolean DEFAULT true,
  shift_reminder_24h_email boolean DEFAULT true,
  shift_reminder_1h_email boolean DEFAULT false,
  shift_cancellation_email boolean DEFAULT true,
  shift_reminder_push boolean DEFAULT false,
  last_minute_coverage_push boolean DEFAULT false,
  admin_announcements boolean DEFAULT true,
  newsletter boolean DEFAULT false,
  reminder_hours_before integer DEFAULT 24,
  quiet_hours_start time without time zone,
  quiet_hours_end time without time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  shift_id uuid,
  subject text NOT NULL,
  body text NOT NULL,
  scheduled_for timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  status text DEFAULT 'pending'::text,
  retry_count integer DEFAULT 0,
  error_message text,
  email_log_id uuid,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  name text,
  phone text,
  role text NOT NULL DEFAULT 'volunteer'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  active boolean DEFAULT true,
  email_opt_in boolean NOT NULL DEFAULT false,
  email_categories jsonb DEFAULT '{}'::jsonb,
  avatar_url text,
  calendar_sync_token uuid DEFAULT gen_random_uuid(),
  calendar_sync_enabled boolean DEFAULT false,
  last_calendar_sync timestamp with time zone,
  email text
);
CREATE TABLE IF NOT EXISTS public.pwa_installations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  device_type text,
  platform text,
  installed_at timestamp with time zone DEFAULT now(),
  last_opened_at timestamp with time zone,
  is_active boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid,
  subject text NOT NULL,
  body text NOT NULL,
  email_type text NOT NULL,
  recipients jsonb NOT NULL,
  filter_criteria jsonb,
  scheduled_for timestamp with time zone NOT NULL,
  status text DEFAULT 'pending'::text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone,
  error_message text
);
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.session_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  config_key text NOT NULL,
  config_value text NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);
CREATE TABLE IF NOT EXISTS public.session_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id uuid,
  event_type text NOT NULL,
  event_details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.shift_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.shift_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  slot text,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  capacity integer DEFAULT 5,
  recurrence_pattern text DEFAULT 'weekly'::text,
  days_of_week integer[],
  active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.shift_waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL,
  user_id uuid NOT NULL,
  "position" integer NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  notified_at timestamp with time zone,
  expires_at timestamp with time zone,
  status text DEFAULT 'waiting'::text
);
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_date date NOT NULL,
  slot text NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  capacity integer NOT NULL DEFAULT 2,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  device_fingerprint text,
  user_agent text,
  ip_address inet,
  browser_name text,
  os_name text,
  device_type text DEFAULT 'desktop'::text,
  is_active boolean DEFAULT true,
  last_activity_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  revoked_at timestamp with time zone,
  revoked_reason text
);

-- ============ PRIMARY KEY / UNIQUE CONSTRAINTS ============
-- (added before FKs so referenced keys exist)
DO $$ BEGIN
  ALTER TABLE public.auth_blocklist ADD CONSTRAINT auth_blocklist_pkey PRIMARY KEY (email);
  ALTER TABLE public.auth_rate_limits ADD CONSTRAINT auth_rate_limits_pkey PRIMARY KEY (id);
  ALTER TABLE public.calendar_exports ADD CONSTRAINT calendar_exports_pkey PRIMARY KEY (id);
  ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);
  ALTER TABLE public.email_service_config ADD CONSTRAINT email_service_config_pkey PRIMARY KEY (id);
  ALTER TABLE public.email_service_config ADD CONSTRAINT email_service_config_service_name_key UNIQUE (service_name);
  ALTER TABLE public.email_templates ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);
  ALTER TABLE public.emergency_coverage_requests ADD CONSTRAINT emergency_coverage_requests_pkey PRIMARY KEY (id);
  ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);
  ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);
  ALTER TABLE public.notification_queue ADD CONSTRAINT notification_queue_pkey PRIMARY KEY (id);
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
  ALTER TABLE public.pwa_installations ADD CONSTRAINT pwa_installations_pkey PRIMARY KEY (id);
  ALTER TABLE public.scheduled_emails ADD CONSTRAINT scheduled_emails_pkey PRIMARY KEY (id);
  ALTER TABLE public.security_audit_log ADD CONSTRAINT security_audit_log_pkey PRIMARY KEY (id);
  ALTER TABLE public.session_config ADD CONSTRAINT session_config_pkey PRIMARY KEY (id);
  ALTER TABLE public.session_config ADD CONSTRAINT session_config_config_key_key UNIQUE (config_key);
  ALTER TABLE public.session_events ADD CONSTRAINT session_events_pkey PRIMARY KEY (id);
  ALTER TABLE public.shift_assignments ADD CONSTRAINT shift_assignments_pkey PRIMARY KEY (id);
  ALTER TABLE public.shift_assignments ADD CONSTRAINT shift_assignments_shift_id_user_id_key UNIQUE (shift_id, user_id);
  ALTER TABLE public.shift_templates ADD CONSTRAINT shift_templates_pkey PRIMARY KEY (id);
  ALTER TABLE public.shift_templates ADD CONSTRAINT shift_templates_name_key UNIQUE (name);
  ALTER TABLE public.shift_waitlist ADD CONSTRAINT shift_waitlist_pkey PRIMARY KEY (id);
  ALTER TABLE public.shift_waitlist ADD CONSTRAINT shift_waitlist_shift_id_user_id_key UNIQUE (shift_id, user_id);
  ALTER TABLE public.shifts ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);
  ALTER TABLE public.shifts ADD CONSTRAINT shifts_shift_date_slot_key UNIQUE (shift_date, slot);
  ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);
  ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- ============ FOREIGN KEY CONSTRAINTS ============
DO $$ BEGIN
  ALTER TABLE public.auth_blocklist ADD CONSTRAINT auth_blocklist_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES profiles(id) ON DELETE SET NULL;
  ALTER TABLE public.calendar_exports ADD CONSTRAINT calendar_exports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE SET NULL;
  ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES profiles(id) ON DELETE SET NULL;
  ALTER TABLE public.email_service_config ADD CONSTRAINT email_service_config_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  ALTER TABLE public.email_templates ADD CONSTRAINT email_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  ALTER TABLE public.emergency_coverage_requests ADD CONSTRAINT emergency_coverage_requests_filled_by_fkey FOREIGN KEY (filled_by) REFERENCES profiles(id) ON DELETE SET NULL;
  ALTER TABLE public.emergency_coverage_requests ADD CONSTRAINT emergency_coverage_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES profiles(id) ON DELETE SET NULL;
  ALTER TABLE public.emergency_coverage_requests ADD CONSTRAINT emergency_coverage_requests_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE;
  ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE public.notification_queue ADD CONSTRAINT notification_queue_email_log_id_fkey FOREIGN KEY (email_log_id) REFERENCES email_logs(id);
  ALTER TABLE public.notification_queue ADD CONSTRAINT notification_queue_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE;
  ALTER TABLE public.notification_queue ADD CONSTRAINT notification_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE public.pwa_installations ADD CONSTRAINT pwa_installations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE public.scheduled_emails ADD CONSTRAINT scheduled_emails_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  ALTER TABLE public.scheduled_emails ADD CONSTRAINT scheduled_emails_template_id_fkey FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL;
  ALTER TABLE public.security_audit_log ADD CONSTRAINT security_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  ALTER TABLE public.session_config ADD CONSTRAINT session_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  ALTER TABLE public.session_events ADD CONSTRAINT session_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL;
  ALTER TABLE public.session_events ADD CONSTRAINT session_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE public.shift_assignments ADD CONSTRAINT shift_assignments_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE;
  ALTER TABLE public.shift_assignments ADD CONSTRAINT shift_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  ALTER TABLE public.shift_templates ADD CONSTRAINT shift_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  ALTER TABLE public.shift_waitlist ADD CONSTRAINT shift_waitlist_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE;
  ALTER TABLE public.shift_waitlist ADD CONSTRAINT shift_waitlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ CHECK CONSTRAINTS ============
DO $$ BEGIN
  ALTER TABLE public.email_service_config ADD CONSTRAINT email_service_config_service_name_check CHECK ((service_name = ANY (ARRAY['sendgrid'::text, 'gmail'::text])));
  ALTER TABLE public.email_templates ADD CONSTRAINT email_templates_category_check CHECK ((category = ANY (ARRAY['reminder'::text, 'confirmation'::text, 'promotional'::text, 'urgent'::text, 'welcome'::text])));
  ALTER TABLE public.emergency_coverage_requests ADD CONSTRAINT emergency_coverage_requests_status_check CHECK ((status = ANY (ARRAY['open'::text, 'filled'::text, 'cancelled'::text, 'expired'::text])));
  ALTER TABLE public.emergency_coverage_requests ADD CONSTRAINT emergency_coverage_requests_urgency_check CHECK ((urgency = ANY (ARRAY['normal'::text, 'high'::text, 'critical'::text])));
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['volunteer'::text, 'admin'::text])));
  ALTER TABLE public.scheduled_emails ADD CONSTRAINT scheduled_emails_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'cancelled'::text, 'failed'::text])));
  ALTER TABLE public.shift_templates ADD CONSTRAINT shift_templates_capacity_check CHECK (((capacity > 0) AND (capacity <= 20)));
  ALTER TABLE public.shift_templates ADD CONSTRAINT shift_templates_days_of_week_check CHECK ((array_length(days_of_week, 1) > 0));
  ALTER TABLE public.shift_templates ADD CONSTRAINT shift_templates_recurrence_pattern_check CHECK ((recurrence_pattern = ANY (ARRAY['weekly'::text, 'monthly'::text, 'custom'::text])));
  ALTER TABLE public.shift_templates ADD CONSTRAINT shift_templates_slot_check CHECK ((slot = ANY (ARRAY['AM'::text, 'MID'::text, 'PM'::text])));
  ALTER TABLE public.shift_waitlist ADD CONSTRAINT shift_waitlist_position_check CHECK (("position" > 0));
  ALTER TABLE public.shift_waitlist ADD CONSTRAINT shift_waitlist_status_check CHECK ((status = ANY (ARRAY['waiting'::text, 'notified'::text, 'converted'::text, 'expired'::text, 'cancelled'::text])));
  ALTER TABLE public.shifts ADD CONSTRAINT shifts_slot_check CHECK ((slot = ANY (ARRAY['AM'::text, 'MID'::text, 'PM'::text])));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ INDEXES (non-constraint) ============
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_email_time ON public.auth_rate_limits USING btree (email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_ip_time ON public.auth_rate_limits USING btree (ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_calendar_exports_user_date ON public.calendar_exports USING btree (user_id, exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs USING btree (recipient_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs USING btree (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_service_active ON public.email_service_config USING btree (is_active, priority);
CREATE INDEX IF NOT EXISTS idx_email_service_validated ON public.email_service_config USING btree (is_validated) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates USING btree (active);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON public.email_templates USING btree (category) WHERE (active = true);
CREATE INDEX IF NOT EXISTS idx_emergency_coverage_expires ON public.emergency_coverage_requests USING btree (expires_at) WHERE (status = 'open'::text);
CREATE INDEX IF NOT EXISTS idx_emergency_coverage_shift ON public.emergency_coverage_requests USING btree (shift_id, status);
CREATE INDEX IF NOT EXISTS idx_emergency_coverage_status ON public.emergency_coverage_requests USING btree (status, urgency) WHERE (status = 'open'::text);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON public.notification_queue USING btree (scheduled_for, status) WHERE (status = 'pending'::text);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_status ON public.notification_queue USING btree (user_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles USING btree (active);
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON public.profiles USING btree (avatar_url) WHERE (avatar_url IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_profiles_calendar_sync_token ON public.profiles USING btree (calendar_sync_token) WHERE (calendar_sync_enabled = true);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles USING btree (email);
CREATE INDEX IF NOT EXISTS idx_profiles_email_opt_in ON public.profiles USING btree (email_opt_in) WHERE (email_opt_in = true);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for ON public.scheduled_emails USING btree (scheduled_for) WHERE (status = 'pending'::text);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON public.scheduled_emails USING btree (status);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_action ON public.security_audit_log USING btree (action, created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user ON public.security_audit_log USING btree (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_session_events_created ON public.session_events USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON public.session_events USING btree (session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_type ON public.session_events USING btree (event_type);
CREATE INDEX IF NOT EXISTS idx_session_events_user_id ON public.session_events USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift_created ON public.shift_assignments USING btree (shift_id, created_at);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_user_date ON public.shift_assignments USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shift_templates_active ON public.shift_templates USING btree (active) WHERE (active = true);
CREATE INDEX IF NOT EXISTS idx_shift_templates_recurrence ON public.shift_templates USING btree (recurrence_pattern, active);
CREATE INDEX IF NOT EXISTS idx_shift_waitlist_notified ON public.shift_waitlist USING btree (notified_at) WHERE (status = 'notified'::text);
CREATE INDEX IF NOT EXISTS idx_shift_waitlist_shift ON public.shift_waitlist USING btree (shift_id, "position") WHERE (status = 'waiting'::text);
CREATE INDEX IF NOT EXISTS idx_shift_waitlist_user ON public.shift_waitlist USING btree (user_id, status);
CREATE INDEX IF NOT EXISTS idx_shifts_date_range ON public.shifts USING btree (shift_date, start_time);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions USING btree (user_id, is_active) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions USING btree (expires_at) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions USING btree (session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_shifts_date_slot ON public.shifts USING btree (shift_date, slot);

-- ============ VIEW ============
-- NOTE: get_active_volunteers() references a `volunteer_attendance` relation that does
-- NOT exist in prod (missing view) -- carried over as-is; see MIGRATION_NOTES provenance.
CREATE OR REPLACE VIEW public.shift_fill_rates AS  SELECT s.id AS shift_id,
    s.shift_date,
    s.start_time,
    s.end_time,
    s.slot,
    s.capacity,
    count(sa.id) AS filled_count,
    round((((count(sa.id))::numeric / (NULLIF(s.capacity, 0))::numeric) * (100)::numeric), 1) AS fill_rate_percent,
    (s.capacity - count(sa.id)) AS spots_remaining,
        CASE
            WHEN (count(sa.id) = s.capacity) THEN 'Full'::text
            WHEN (count(sa.id) > 0) THEN 'Partial'::text
            ELSE 'Empty'::text
        END AS fill_status,
    string_agg(p.name, ', '::text ORDER BY sa.created_at) AS volunteer_names
   FROM ((shifts s
     LEFT JOIN shift_assignments sa ON ((s.id = sa.shift_id)))
     LEFT JOIN profiles p ON ((sa.user_id = p.id)))
  GROUP BY s.id, s.shift_date, s.start_time, s.end_time, s.slot, s.capacity;

-- ============ FUNCTIONS (app; citext-extension functions intentionally excluded) ============
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, phone, email, email_opt_in, email_categories, role, active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'name', ''),
    COALESCE(new.raw_user_meta_data ->> 'phone', ''),
    new.email,
    COALESCE((new.raw_user_meta_data ->> 'email_opt_in')::boolean, false),
    COALESCE(new.raw_user_meta_data -> 'email_categories', '{}'::jsonb),
    'volunteer',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    email = COALESCE(EXCLUDED.email, profiles.email);

  RETURN new;
END;
$function$;

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
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'New Volunteer');
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  user_email := COALESCE(NEW.email, '');
  user_email_opt_in := COALESCE((NEW.raw_user_meta_data->>'email_opt_in')::boolean, false);
  user_email_categories := COALESCE(NEW.raw_user_meta_data->'email_categories', '{}'::jsonb);

  INSERT INTO public.profiles (
    id, name, email, phone, role, email_opt_in, email_categories, active, created_at, updated_at
  ) VALUES (
    NEW.id, user_name, user_email, user_phone, 'volunteer',
    user_email_opt_in, user_email_categories, true, NOW(), NOW()
  );

  INSERT INTO public.notification_preferences (
    user_id, shift_reminder_24h_email, shift_reminder_1h_email, shift_confirmation_email,
    shift_cancellation_email, admin_announcements, newsletter, last_minute_coverage_push,
    shift_reminder_push, reminder_hours_before, created_at, updated_at
  ) VALUES (
    NEW.id, user_email_opt_in, user_email_opt_in, user_email_opt_in, user_email_opt_in,
    false, false, user_email_opt_in, false, 24, NOW(), NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_notification_preferences()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_role_self_modification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    IF NOT is_admin() THEN
      RAISE EXCEPTION 'Permission denied: Only administrators can modify user roles';
    END IF;

    IF OLD.role = 'admin' AND NEW.role = 'volunteer' THEN
      IF (SELECT COUNT(*) FROM profiles WHERE role = 'admin' AND id != NEW.id) < 1 THEN
        RAISE EXCEPTION 'Cannot demote the last admin account';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_shift_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if ((select count(*) from public.shift_assignments where shift_id = new.shift_id)
      >= (select capacity from public.shifts where id = new.shift_id)) then
    raise exception 'Shift is full';
  end if;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.block_blocklisted_auth_users()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if exists (select 1 from public.auth_blocklist b where b.email = new.email) then
    raise exception 'This email cannot sign up.';
  end if;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.apply_shift_template(template_id_param uuid, start_date_param date, end_date_param date)
 RETURNS TABLE(shifts_created integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
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
      INSERT INTO shifts (shift_date, slot, start_time, end_time, capacity)
      VALUES (current_date_var, template_record.slot, template_record.start_time, template_record.end_time, template_record.capacity)
      ON CONFLICT (shift_date, slot) DO NOTHING;
      IF FOUND THEN
        shifts_count := shifts_count + 1;
      END IF;
    END IF;
    current_date_var := current_date_var + INTERVAL '1 day';
  END LOOP;
  RETURN QUERY SELECT shifts_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_volunteer_hours(p_user_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(total_hours numeric, shift_count integer, hours_breakdown jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600)::NUMERIC as total_hours,
    COUNT(*)::INTEGER as shift_count,
    jsonb_agg(jsonb_build_object('date', s.shift_date, 'slot', s.slot,
      'hours', EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600) ORDER BY s.shift_date) as hours_breakdown
  FROM shift_assignments sa
  JOIN shifts s ON sa.shift_id = s.id
  WHERE sa.user_id = p_user_id
    AND s.shift_date BETWEEN p_start_date AND p_end_date
    AND s.shift_date <= CURRENT_DATE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(p_ip_address inet, p_email text DEFAULT NULL::text, p_attempt_type text DEFAULT 'login'::text, p_max_attempts integer DEFAULT 5, p_window_minutes integer DEFAULT 15)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  attempt_count int;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM auth_rate_limits
  WHERE ip_address = p_ip_address
    AND attempt_type = p_attempt_type
    AND attempted_at > now() - (p_window_minutes || ' minutes')::interval
    AND NOT success;

  IF p_email IS NOT NULL THEN
    SELECT COUNT(*) INTO attempt_count
    FROM auth_rate_limits
    WHERE (ip_address = p_ip_address OR email = lower(p_email))
      AND attempt_type = p_attempt_type
      AND attempted_at > now() - (p_window_minutes || ' minutes')::interval
      AND NOT success;
  END IF;

  RETURN attempt_count < p_max_attempts;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET is_active = false, revoked_at = now(), revoked_reason = 'timeout'
  WHERE is_active = true AND expires_at < now();
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN cleaned_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.day_roster(d date)
 RETURNS TABLE(slot text, first_name text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select s.slot,
         nullif(split_part(coalesce(p.name, ''), ' ', 1), '') as first_name
  from public.shift_assignments sa
  join public.shifts s on s.id = sa.shift_id
  join public.profiles p on p.id = sa.user_id
  where s.shift_date = d
  order by s.slot, first_name nulls last;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_volunteers(p_start_date date, p_end_date date, p_limit integer DEFAULT 10)
 RETURNS TABLE(user_id uuid, volunteer_name text, volunteer_email text, shift_count integer, total_hours numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT va.user_id, va.volunteer_name, va.volunteer_email,
    COUNT(*)::INTEGER as shift_count, SUM(va.hours)::NUMERIC as total_hours
  FROM volunteer_attendance va
  WHERE va.shift_date BETWEEN p_start_date AND p_end_date
    AND va.status = 'Completed'
  GROUP BY va.user_id, va.volunteer_name, va.volunteer_email
  ORDER BY shift_count DESC, total_hours DESC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_popular_time_slots()
 RETURNS TABLE(slot text, total_shifts integer, avg_fill_rate numeric, total_volunteers integer)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT sfr.slot, COUNT(*)::INTEGER as total_shifts,
    ROUND(AVG(sfr.fill_rate_percent), 1) as avg_fill_rate,
    SUM(sfr.filled_count)::INTEGER as total_volunteers
  FROM shift_fill_rates sfr
  GROUP BY sfr.slot
  ORDER BY avg_fill_rate DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_shift_statistics(p_start_date date, p_end_date date)
 RETURNS TABLE(total_shifts integer, avg_fill_rate numeric, full_shifts integer, partial_shifts integer, empty_shifts integer, total_capacity integer, total_filled integer)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)::INTEGER as total_shifts,
    ROUND(AVG(fill_rate_percent), 1) as avg_fill_rate,
    COUNT(*) FILTER (WHERE fill_status = 'Full')::INTEGER as full_shifts,
    COUNT(*) FILTER (WHERE fill_status = 'Partial')::INTEGER as partial_shifts,
    COUNT(*) FILTER (WHERE fill_status = 'Empty')::INTEGER as empty_shifts,
    SUM(capacity)::INTEGER as total_capacity,
    SUM(filled_count)::INTEGER as total_filled
  FROM shift_fill_rates
  WHERE shift_date BETWEEN p_start_date AND p_end_date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_session_valid(token text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_sessions
    WHERE session_token = token AND is_active = true AND expires_at > now()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_auth_attempt(p_ip_address inet, p_email text, p_attempt_type text, p_success boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO auth_rate_limits (ip_address, email, attempt_type, success)
  VALUES (p_ip_address, lower(p_email), p_attempt_type, p_success);
  DELETE FROM auth_rate_limits WHERE attempted_at < now() - interval '24 hours';
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_waitlist(shift_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  waitlist_record RECORD;
  available_spots INTEGER;
BEGIN
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

    INSERT INTO notification_queue (user_id, shift_id, notification_type, subject, body, scheduled_for)
    VALUES (waitlist_record.user_id, shift_id_param, 'waitlist_spot_available',
      'Shift Spot Available!',
      'A spot has opened up for a shift you''re waitlisted for. You have 48 hours to claim it.',
      NOW());
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_all_user_sessions(target_user_id uuid, reason text DEFAULT 'logout'::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  revoked_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET is_active = false, revoked_at = now(), revoked_reason = reason
  WHERE user_id = target_user_id AND is_active = true;
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  INSERT INTO session_events (user_id, event_type, event_details)
  VALUES (target_user_id, 'revoke_all', jsonb_build_object('reason', reason, 'count', revoked_count));
  RETURN revoked_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.schedule_shift_reminder()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
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
    INSERT INTO notification_queue (user_id, notification_type, shift_id, subject, body, scheduled_for)
    VALUES (v_user_id, 'shift_reminder', NEW.shift_id,
      'Reminder: Your upcoming volunteer shift',
      'This is a reminder about your volunteer shift tomorrow. We look forward to seeing you!',
      v_scheduled_time);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.seed_shifts_range(start_date date, end_date date, cap integer DEFAULT 2)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only admins can seed shifts.';
  end if;

  insert into public.shifts (shift_date, slot, start_time, end_time, capacity)
  select d::date, s.slot, s.start_t, s.end_t, cap
  from generate_series(start_date, end_date, interval '1 day') as g(d),
       (values ('AM'::text, time '09:00', time '12:00'),
               ('MID', time '12:00', time '15:00'),
               ('PM', time '15:00', time '17:00')) as s(slot, start_t, end_t)
  where extract(dow from d::date) != 0
  on conflict (shift_date, slot) do nothing;

  insert into public.shifts (shift_date, slot, start_time, end_time, capacity)
  select d::date, s.slot, s.start_t, s.end_t, cap
  from generate_series(start_date, end_date, interval '1 day') as g(d),
       (values ('AM'::text, time '10:00', time '12:00'),
               ('MID', time '12:00', time '15:00'),
               ('PM', time '15:00', time '17:00')) as s(slot, start_t, end_t)
  where extract(dow from d::date) = 0
  on conflict (shift_date, slot) do nothing;
end;
$function$;

CREATE OR REPLACE FUNCTION public.shift_counts(ids uuid[])
 RETURNS TABLE(shift_id uuid, qty integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select sa.shift_id, count(*)::int as qty
  from public.shift_assignments sa
  where sa.shift_id = any(ids)
  group by sa.shift_id;
$function$;

CREATE OR REPLACE FUNCTION public.update_session_activity(token text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE user_sessions SET last_activity_at = now()
  WHERE session_token = token AND is_active = true AND expires_at > now();
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$function$;

-- ============ ENABLE ROW LEVEL SECURITY ============
ALTER TABLE public.auth_blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_service_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_coverage_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
CREATE POLICY blocklist_admin_only ON public.auth_blocklist AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY auth_rate_limits_service_only ON public.auth_rate_limits AS PERMISSIVE FOR ALL TO public USING (false);
CREATE POLICY calendar_exports_admin_access ON public.calendar_exports AS PERMISSIVE FOR SELECT TO authenticated USING ((is_admin() OR (user_id = auth.uid())));
CREATE POLICY calendar_exports_own_access ON public.calendar_exports AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY email_logs_admin_only ON public.email_logs AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY email_service_config_admin_only ON public.email_service_config AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY email_templates_admin_only ON public.email_templates AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY emergency_coverage_admin_update ON public.emergency_coverage_requests AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY emergency_coverage_admin_write ON public.emergency_coverage_requests AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY emergency_coverage_read_open ON public.emergency_coverage_requests AS PERMISSIVE FOR SELECT TO public USING (((status = 'open'::text) OR (filled_by = auth.uid())));
CREATE POLICY emergency_coverage_volunteer_claim ON public.emergency_coverage_requests AS PERMISSIVE FOR UPDATE TO public USING (((status = 'open'::text) AND (filled_by IS NULL))) WITH CHECK ((filled_by = auth.uid()));
CREATE POLICY notification_prefs_own_access ON public.notification_preferences AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY notification_queue_admin_only ON public.notification_queue AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY profiles_admin_read_all ON public.profiles AS PERMISSIVE FOR SELECT TO public USING (((((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text)));
CREATE POLICY profiles_admin_update_all ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING (((((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text))) WITH CHECK (((((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text)));
CREATE POLICY profiles_insert_own ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = id));
CREATE POLICY profiles_read_own ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));
CREATE POLICY profiles_service_role_all ON public.profiles AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY profiles_update_own_safe ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = id)) WITH CHECK (((auth.uid() = id) AND (role = ( SELECT profiles_1.role FROM profiles profiles_1 WHERE (profiles_1.id = auth.uid())))));
CREATE POLICY pwa_installations_own_access ON public.pwa_installations AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY scheduled_emails_admin_only ON public.scheduled_emails AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY audit_log_admin_read ON public.security_audit_log AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
CREATE POLICY "Admins can update session config" ON public.session_config AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
CREATE POLICY "Anyone can read session config" ON public.session_config AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages session events" ON public.session_events AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'service_role'::text));
CREATE POLICY "Users can insert own session events" ON public.session_events AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own session events" ON public.session_events AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Shift assignments are viewable by everyone" ON public.shift_assignments AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY assignments_delete ON public.shift_assignments AS PERMISSIVE FOR DELETE TO public USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))));
CREATE POLICY assignments_insert ON public.shift_assignments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = auth.uid()));
CREATE POLICY assignments_read ON public.shift_assignments AS PERMISSIVE FOR SELECT TO public USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))));
CREATE POLICY shift_templates_admin_write ON public.shift_templates AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY shift_templates_read ON public.shift_templates AS PERMISSIVE FOR SELECT TO public USING (((active = true) OR (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));
CREATE POLICY shift_waitlist_admin_access ON public.shift_waitlist AS PERMISSIVE FOR ALL TO authenticated USING ((is_admin() OR (user_id = auth.uid()))) WITH CHECK ((is_admin() OR (user_id = auth.uid())));
CREATE POLICY shift_waitlist_own_access ON public.shift_waitlist AS PERMISSIVE FOR ALL TO public USING ((user_id = auth.uid()));
CREATE POLICY shifts_admin_write ON public.shifts AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY shifts_read ON public.shifts AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages all sessions" ON public.user_sessions AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'service_role'::text));
CREATE POLICY "Users can delete own sessions" ON public.user_sessions AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own sessions" ON public.user_sessions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own sessions" ON public.user_sessions AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own sessions" ON public.user_sessions AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

-- ============ TRIGGERS ============
CREATE OR REPLACE TRIGGER protect_role_changes BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION prevent_role_self_modification();
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trigger_create_notification_prefs AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION create_notification_preferences();
CREATE OR REPLACE TRIGGER trg_check_shift_capacity BEFORE INSERT ON public.shift_assignments FOR EACH ROW EXECUTE FUNCTION check_shift_capacity();
CREATE OR REPLACE TRIGGER trigger_schedule_shift_reminder AFTER INSERT ON public.shift_assignments FOR EACH ROW EXECUTE FUNCTION schedule_shift_reminder();

-- Supabase auth trigger: provisions a profile row when an auth user is created.
CREATE OR REPLACE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
