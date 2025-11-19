export type Role = "volunteer" | "admin"

export type ShiftSlot = "AM" | "MID" | "PM"

export type EmailStatus = "pending" | "sent" | "failed"

export type FillStatus = "Full" | "Partial" | "Empty"

export type WaitlistStatus = "waiting" | "notified" | "expired" | "assigned"

export type EmergencyCoverageStatus = "open" | "claimed" | "filled" | "expired"

// Database table types
export interface Profile {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  role: Role
  active: boolean
  email_opt_in: boolean
  email_categories: Record<string, boolean> | null
  avatar_url: string | null
  calendar_sync_enabled: boolean
  calendar_sync_token: string | null
  last_calendar_sync: string | null
  created_at: string
  updated_at: string
}

export interface Shift {
  id: string
  shift_date: string
  slot: ShiftSlot
  start_time: string
  end_time: string
  capacity: number
  created_at: string
}

export interface ShiftAssignment {
  id: string
  shift_id: string
  user_id: string
  created_at: string
}

export interface ShiftWithRelations extends Shift {
  shift_assignments?: ShiftAssignment[]
  profiles?: Profile
}

export interface AssignmentWithRelations extends ShiftAssignment {
  shifts?: Shift
  profiles?: Profile
}

export interface EmailLog {
  id: string
  sent_by: string
  recipient_id: string
  recipient_email: string
  email_type: string
  subject: string
  status: EmailStatus
  error_message: string | null
  sent_at: string
}

export interface EmailServiceConfig {
  id: string
  service_name: string
  priority: number
  is_active: boolean
  is_validated: boolean
  validation_error: string | null
  last_validated_at: string | null
  sendgrid_api_key: string | null
  sendgrid_from_name: string | null
  sendgrid_from_email: string | null
  gmail_client_id: string | null
  gmail_client_secret: string | null
  gmail_refresh_token: string | null
  gmail_access_token: string | null
  gmail_token_expiry: string | null
  gmail_from_email: string | null
  emails_sent_count: number
  last_email_sent_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ShiftFillRate {
  shift_id: string
  shift_date: string
  start_time: string
  end_time: string
  slot: string
  capacity: number
  filled_count: number
  fill_rate_percent: number
  spots_remaining: number
  fill_status: FillStatus
  volunteer_names: string | null
}

export interface WaitlistEntry {
  id: string
  shift_id: string
  user_id: string
  position: number
  status: WaitlistStatus
  joined_at: string
  notified_at: string | null
  expires_at: string | null
}

export interface ShiftTemplate {
  id: string
  name: string
  description: string | null
  slot: ShiftSlot
  start_time: string
  end_time: string
  capacity: number
  days_of_week: number[]
  recurrence_pattern: string | null
  active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface EmailTemplate {
  id: string
  name: string
  category: string
  subject: string
  body: string
  variables: Record<string, unknown> | null
  active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  id: string
  user_id: string
  shift_confirmation_email: boolean
  shift_cancellation_email: boolean
  shift_reminder_24h_email: boolean
  shift_reminder_1h_email: boolean
  shift_reminder_push: boolean
  last_minute_coverage_push: boolean
  admin_announcements: boolean
  newsletter: boolean
  reminder_hours_before: number
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  created_at: string
  updated_at: string
}

export interface EmergencyCoverageRequest {
  id: string
  shift_id: string
  requested_by: string
  reason: string
  urgency: string
  status: EmergencyCoverageStatus
  notification_sent: boolean
  filled_by: string | null
  filled_at: string | null
  expires_at: string
  created_at: string
}

// View types for queries with joins
export interface VolunteerAttendance {
  assignment_id: string
  volunteer_name: string
  volunteer_email: string
  shift_date: string
  start_time: string
  end_time: string
  slot: string
  status: "Completed" | "Today" | "Upcoming"
  hours: number
  signed_up_at: string
}

// Filter criteria type
export interface EmailFilterCriteria {
  roles?: Role[]
  email_opt_in?: boolean
  email_categories?: string[]
  active?: boolean
}
