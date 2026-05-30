// AUTO-GENERATED from the STAGING Supabase schema (project volunteer-hub-staging)
// via `generate_typescript_types`. Last regenerated 2026-05-29 after Phase 1
// (script 031_multitenancy_core): every tenant table now carries org_id, plus
// the new organizations / org_settings / reserved_slugs tables.
//
// NOTE: This is the canonical Supabase `Database` type shape. It is intentionally
// kept SEPARATE from the hand-written `types/database.ts` (flat interfaces like
// Profile, Shift, Role) which the app currently imports throughout. Migrating the
// app to these generated types is a refactor for a later phase — do NOT delete
// types/database.ts until that migration happens (locked decision #4).
//
// Regenerate with: supabase gen types typescript --project-id <staging-ref> > types/database.generated.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auth_blocklist: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          email: string
          org_id: string
          reason: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          email: string
          org_id: string
          reason?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          email?: string
          org_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auth_blocklist_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_blocklist_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_rate_limits: {
        Row: {
          attempt_type: string
          attempted_at: string | null
          email: string | null
          id: string
          ip_address: unknown
          success: boolean | null
        }
        Insert: {
          attempt_type: string
          attempted_at?: string | null
          email?: string | null
          id?: string
          ip_address: unknown
          success?: boolean | null
        }
        Update: {
          attempt_type?: string
          attempted_at?: string | null
          email?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean | null
        }
        Relationships: []
      }
      calendar_exports: {
        Row: {
          export_type: string
          exported_at: string | null
          id: string
          ip_address: unknown
          org_id: string
          shift_ids: string[] | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          export_type: string
          exported_at?: string | null
          id?: string
          ip_address?: unknown
          org_id: string
          shift_ids?: string[] | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          export_type?: string
          exported_at?: string | null
          id?: string
          ip_address?: unknown
          org_id?: string
          shift_ids?: string[] | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_exports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          email_type: string | null
          error_message: string | null
          id: string
          org_id: string
          recipient_email: string | null
          recipient_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["email_status"] | null
          subject: string | null
        }
        Insert: {
          email_type?: string | null
          error_message?: string | null
          id?: string
          org_id: string
          recipient_email?: string | null
          recipient_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["email_status"] | null
          subject?: string | null
        }
        Update: {
          email_type?: string | null
          error_message?: string | null
          id?: string
          org_id?: string
          recipient_email?: string | null
          recipient_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["email_status"] | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_service_config: {
        Row: {
          created_at: string | null
          created_by: string | null
          emails_sent_count: number | null
          gmail_access_token: string | null
          gmail_client_id: string | null
          gmail_client_secret: string | null
          gmail_from_email: string | null
          gmail_refresh_token: string | null
          gmail_token_expiry: string | null
          id: string
          is_active: boolean | null
          is_validated: boolean | null
          last_email_sent_at: string | null
          last_validated_at: string | null
          org_id: string
          priority: number | null
          sendgrid_api_key: string | null
          sendgrid_from_email: string | null
          sendgrid_from_name: string | null
          service_name: string
          updated_at: string | null
          validation_error: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          emails_sent_count?: number | null
          gmail_access_token?: string | null
          gmail_client_id?: string | null
          gmail_client_secret?: string | null
          gmail_from_email?: string | null
          gmail_refresh_token?: string | null
          gmail_token_expiry?: string | null
          id?: string
          is_active?: boolean | null
          is_validated?: boolean | null
          last_email_sent_at?: string | null
          last_validated_at?: string | null
          org_id: string
          priority?: number | null
          sendgrid_api_key?: string | null
          sendgrid_from_email?: string | null
          sendgrid_from_name?: string | null
          service_name: string
          updated_at?: string | null
          validation_error?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          emails_sent_count?: number | null
          gmail_access_token?: string | null
          gmail_client_id?: string | null
          gmail_client_secret?: string | null
          gmail_from_email?: string | null
          gmail_refresh_token?: string | null
          gmail_token_expiry?: string | null
          id?: string
          is_active?: boolean | null
          is_validated?: boolean | null
          last_email_sent_at?: string | null
          last_validated_at?: string | null
          org_id?: string
          priority?: number | null
          sendgrid_api_key?: string | null
          sendgrid_from_email?: string | null
          sendgrid_from_name?: string | null
          service_name?: string
          updated_at?: string | null
          validation_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_service_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_service_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          active: boolean | null
          body: string
          category: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          org_id: string
          subject: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          active?: boolean | null
          body: string
          category: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          org_id: string
          subject: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          active?: boolean | null
          body?: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          org_id?: string
          subject?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_coverage_requests: {
        Row: {
          created_at: string | null
          expires_at: string | null
          filled_at: string | null
          filled_by: string | null
          id: string
          notification_sent: boolean | null
          org_id: string
          reason: string | null
          requested_by: string
          shift_id: string
          status: string | null
          urgency: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          filled_at?: string | null
          filled_by?: string | null
          id?: string
          notification_sent?: boolean | null
          org_id: string
          reason?: string | null
          requested_by: string
          shift_id: string
          status?: string | null
          urgency?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          filled_at?: string | null
          filled_by?: string | null
          id?: string
          notification_sent?: boolean | null
          org_id?: string
          reason?: string | null
          requested_by?: string
          shift_id?: string
          status?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_coverage_requests_filled_by_fkey"
            columns: ["filled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_coverage_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_coverage_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_coverage_requests_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shift_fill_rates"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "emergency_coverage_requests_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          admin_announcements: boolean | null
          created_at: string | null
          id: string
          last_minute_coverage_push: boolean | null
          newsletter: boolean | null
          org_id: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          reminder_hours_before: number | null
          shift_cancellation_email: boolean | null
          shift_confirmation_email: boolean | null
          shift_reminder_1h_email: boolean | null
          shift_reminder_24h_email: boolean | null
          shift_reminder_push: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_announcements?: boolean | null
          created_at?: string | null
          id?: string
          last_minute_coverage_push?: boolean | null
          newsletter?: boolean | null
          org_id: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_hours_before?: number | null
          shift_cancellation_email?: boolean | null
          shift_confirmation_email?: boolean | null
          shift_reminder_1h_email?: boolean | null
          shift_reminder_24h_email?: boolean | null
          shift_reminder_push?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_announcements?: boolean | null
          created_at?: string | null
          id?: string
          last_minute_coverage_push?: boolean | null
          newsletter?: boolean | null
          org_id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_hours_before?: number | null
          shift_cancellation_email?: boolean | null
          shift_confirmation_email?: boolean | null
          shift_reminder_1h_email?: boolean | null
          shift_reminder_24h_email?: boolean | null
          shift_reminder_push?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          body: string
          created_at: string | null
          email_log_id: string | null
          error_message: string | null
          id: string
          notification_type: string
          org_id: string
          retry_count: number | null
          scheduled_for: string
          sent_at: string | null
          shift_id: string | null
          status: string | null
          subject: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          email_log_id?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          org_id: string
          retry_count?: number | null
          scheduled_for: string
          sent_at?: string | null
          shift_id?: string | null
          status?: string | null
          subject: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          email_log_id?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          org_id?: string
          retry_count?: number | null
          scheduled_for?: string
          sent_at?: string | null
          shift_id?: string | null
          status?: string | null
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "email_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shift_fill_rates"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "notification_queue_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          display_name: string
          logo_url: string | null
          org_id: string
          primary_color: string | null
          support_email: string | null
          updated_at: string
        }
        Insert: {
          display_name: string
          logo_url?: string | null
          org_id: string
          primary_color?: string | null
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          display_name?: string
          logo_url?: string | null
          org_id?: string
          primary_color?: string | null
          support_email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          name: string
          plan: string
          slug: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          name: string
          plan?: string
          slug: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          name?: string
          plan?: string
          slug?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean | null
          avatar_url: string | null
          calendar_sync_enabled: boolean | null
          calendar_sync_token: string | null
          created_at: string
          email: string | null
          email_categories: Json | null
          email_opt_in: boolean
          id: string
          last_calendar_sync: string | null
          name: string | null
          org_id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          avatar_url?: string | null
          calendar_sync_enabled?: boolean | null
          calendar_sync_token?: string | null
          created_at?: string
          email?: string | null
          email_categories?: Json | null
          email_opt_in?: boolean
          id: string
          last_calendar_sync?: string | null
          name?: string | null
          org_id: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          avatar_url?: string | null
          calendar_sync_enabled?: boolean | null
          calendar_sync_token?: string | null
          created_at?: string
          email?: string | null
          email_categories?: Json | null
          email_opt_in?: boolean
          id?: string
          last_calendar_sync?: string | null
          name?: string | null
          org_id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pwa_installations: {
        Row: {
          device_type: string | null
          id: string
          installed_at: string | null
          is_active: boolean | null
          last_opened_at: string | null
          org_id: string | null
          platform: string | null
          user_id: string | null
        }
        Insert: {
          device_type?: string | null
          id?: string
          installed_at?: string | null
          is_active?: boolean | null
          last_opened_at?: string | null
          org_id?: string | null
          platform?: string | null
          user_id?: string | null
        }
        Update: {
          device_type?: string | null
          id?: string
          installed_at?: string | null
          is_active?: boolean | null
          last_opened_at?: string | null
          org_id?: string | null
          platform?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pwa_installations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reserved_slugs: {
        Row: {
          slug: string
        }
        Insert: {
          slug: string
        }
        Update: {
          slug?: string
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          email_type: string
          error_message: string | null
          filter_criteria: Json | null
          id: string
          org_id: string
          recipients: Json
          scheduled_for: string
          sent_at: string | null
          status: string | null
          subject: string
          template_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          email_type: string
          error_message?: string | null
          filter_criteria?: Json | null
          id?: string
          org_id: string
          recipients: Json
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          subject: string
          template_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          email_type?: string
          error_message?: string | null
          filter_criteria?: Json | null
          id?: string
          org_id?: string
          recipients?: Json
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_emails_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_emails_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_emails_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          org_id: string | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          org_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          org_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      session_config: {
        Row: {
          config_key: string
          config_value: string
          description: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: string
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      session_events: {
        Row: {
          created_at: string | null
          event_details: Json | null
          event_type: string
          id: string
          ip_address: unknown
          org_id: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          org_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          org_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          created_at: string
          id: string
          org_id: string
          shift_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          shift_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          shift_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shift_fill_rates"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_templates: {
        Row: {
          active: boolean | null
          capacity: number | null
          created_at: string | null
          created_by: string | null
          days_of_week: number[] | null
          description: string | null
          end_time: string
          id: string
          name: string
          org_id: string
          recurrence_pattern: string | null
          slot: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          capacity?: number | null
          created_at?: string | null
          created_by?: string | null
          days_of_week?: number[] | null
          description?: string | null
          end_time: string
          id?: string
          name: string
          org_id: string
          recurrence_pattern?: string | null
          slot?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          capacity?: number | null
          created_at?: string | null
          created_by?: string | null
          days_of_week?: number[] | null
          description?: string | null
          end_time?: string
          id?: string
          name?: string
          org_id?: string
          recurrence_pattern?: string | null
          slot?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_waitlist: {
        Row: {
          expires_at: string | null
          id: string
          joined_at: string | null
          notified_at: string | null
          org_id: string
          position: number
          shift_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          joined_at?: string | null
          notified_at?: string | null
          org_id: string
          position: number
          shift_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          joined_at?: string | null
          notified_at?: string | null
          org_id?: string
          position?: number
          shift_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_waitlist_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_waitlist_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shift_fill_rates"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "shift_waitlist_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          capacity: number
          created_at: string
          end_time: string
          id: string
          org_id: string
          shift_date: string
          slot: string
          start_time: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          end_time: string
          id?: string
          org_id: string
          shift_date: string
          slot: string
          start_time: string
        }
        Update: {
          capacity?: number
          created_at?: string
          end_time?: string
          id?: string
          org_id?: string
          shift_date?: string
          slot?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          browser_name: string | null
          created_at: string | null
          device_fingerprint: string | null
          device_type: string | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity_at: string | null
          org_id: string
          os_name: string | null
          revoked_at: string | null
          revoked_reason: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser_name?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          device_type?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string | null
          org_id: string
          os_name?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser_name?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          device_type?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string | null
          org_id?: string
          os_name?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      shift_fill_rates: {
        Row: {
          capacity: number | null
          end_time: string | null
          fill_rate_percent: number | null
          fill_status: string | null
          filled_count: number | null
          shift_date: string | null
          shift_id: string | null
          slot: string | null
          spots_remaining: number | null
          start_time: string | null
          volunteer_names: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_shift_template: {
        Args: {
          end_date_param: string
          start_date_param: string
          template_id_param: string
        }
        Returns: {
          shifts_created: number
        }[]
      }
      calculate_volunteer_hours: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          hours_breakdown: Json
          shift_count: number
          total_hours: number
        }[]
      }
      check_auth_rate_limit: {
        Args: {
          p_attempt_type?: string
          p_email?: string
          p_ip_address: unknown
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_sessions: { Args: never; Returns: number }
      day_roster: {
        Args: { d: string }
        Returns: {
          first_name: string
          slot: string
        }[]
      }
      get_active_volunteers: {
        Args: { p_end_date: string; p_limit?: number; p_start_date: string }
        Returns: {
          shift_count: number
          total_hours: number
          user_id: string
          volunteer_email: string
          volunteer_name: string
        }[]
      }
      get_popular_time_slots: {
        Args: never
        Returns: {
          avg_fill_rate: number
          slot: string
          total_shifts: number
          total_volunteers: number
        }[]
      }
      get_shift_statistics: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          avg_fill_rate: number
          empty_shifts: number
          full_shifts: number
          partial_shifts: number
          total_capacity: number
          total_filled: number
          total_shifts: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_session_valid: { Args: { token: string }; Returns: boolean }
      log_auth_attempt: {
        Args: {
          p_attempt_type: string
          p_email: string
          p_ip_address: unknown
          p_success: boolean
        }
        Returns: undefined
      }
      process_waitlist: { Args: { shift_id_param: string }; Returns: undefined }
      revoke_all_user_sessions: {
        Args: { reason?: string; target_user_id: string }
        Returns: number
      }
      seed_shifts_range: {
        Args: { cap?: number; end_date: string; start_date: string }
        Returns: undefined
      }
      shift_counts: {
        Args: { ids: string[] }
        Returns: {
          qty: number
          shift_id: string
        }[]
      }
      update_session_activity: { Args: { token: string }; Returns: boolean }
    }
    Enums: {
      email_status: "pending" | "sent" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      email_status: ["pending", "sent", "failed"],
    },
  },
} as const
