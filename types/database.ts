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
