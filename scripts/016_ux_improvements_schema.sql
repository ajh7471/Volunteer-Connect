-- Feature #4: User Experience Improvements Database Schema
-- Adds support for profile customization, calendar sync, and notification preferences

-- Add profile photo storage
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS calendar_sync_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS calendar_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_calendar_sync TIMESTAMP WITH TIME ZONE;

-- Create index for calendar sync lookups
CREATE INDEX IF NOT EXISTS idx_profiles_calendar_sync_token 
ON profiles(calendar_sync_token) WHERE calendar_sync_enabled = true;

-- Add notification preferences table for granular control
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Email notifications
  shift_confirmation_email BOOLEAN DEFAULT true,
  shift_reminder_24h_email BOOLEAN DEFAULT true,
  shift_reminder_1h_email BOOLEAN DEFAULT false,
  shift_cancellation_email BOOLEAN DEFAULT true,
  
  -- Push notifications (future)
  shift_reminder_push BOOLEAN DEFAULT false,
  last_minute_coverage_push BOOLEAN DEFAULT false,
  
  -- Communication preferences
  admin_announcements BOOLEAN DEFAULT true,
  newsletter BOOLEAN DEFAULT false,
  
  -- Timing preferences
  reminder_hours_before INTEGER DEFAULT 24,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS on notification preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view and update their own preferences
CREATE POLICY notification_prefs_own_access ON notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically create notification preferences for new users
CREATE OR REPLACE FUNCTION create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification preferences when profile is created
DROP TRIGGER IF EXISTS trigger_create_notification_prefs ON profiles;
CREATE TRIGGER trigger_create_notification_prefs
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_preferences();

-- Add PWA installation tracking
CREATE TABLE IF NOT EXISTS pwa_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  platform TEXT, -- 'ios', 'android', 'windows', 'macos'
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_opened_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS on PWA installations
ALTER TABLE pwa_installations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own installations
CREATE POLICY pwa_installations_own_access ON pwa_installations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create calendar export audit log
CREATE TABLE IF NOT EXISTS calendar_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  export_type TEXT NOT NULL, -- 'single', 'all', 'sync'
  shift_ids UUID[], -- array of shift IDs if single/multiple
  exported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on calendar exports
ALTER TABLE calendar_exports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own export history
CREATE POLICY calendar_exports_own_access ON calendar_exports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all exports
CREATE POLICY calendar_exports_admin_access ON calendar_exports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create notification queue table for scheduled/automated notifications
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type TEXT NOT NULL, -- 'shift_reminder', 'shift_confirmation', etc.
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  
  -- Notification content
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Status tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Delivery tracking
  email_log_id UUID REFERENCES email_logs(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on notification queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Admins only can manage notification queue
CREATE POLICY notification_queue_admin_only ON notification_queue
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for efficient notification processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled 
ON notification_queue(scheduled_for, status) 
WHERE status = 'pending';

-- Create function to schedule shift reminders automatically
CREATE OR REPLACE FUNCTION schedule_shift_reminder()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_reminder_hours INTEGER;
  v_scheduled_time TIMESTAMP WITH TIME ZONE;
  v_shift_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user ID and preferences
  v_user_id := NEW.user_id;
  
  -- Get user's reminder preference (default 24 hours)
  SELECT COALESCE(reminder_hours_before, 24) INTO v_reminder_hours
  FROM notification_preferences
  WHERE user_id = v_user_id;
  
  -- Calculate shift datetime
  SELECT (shift_date || ' ' || start_time)::TIMESTAMP WITH TIME ZONE INTO v_shift_datetime
  FROM shifts
  WHERE id = NEW.shift_id;
  
  -- Calculate reminder time
  v_scheduled_time := v_shift_datetime - (v_reminder_hours || ' hours')::INTERVAL;
  
  -- Only schedule if reminder is in the future
  IF v_scheduled_time > NOW() THEN
    -- Get user email
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;
    
    -- Insert into notification queue
    INSERT INTO notification_queue (
      user_id,
      notification_type,
      shift_id,
      subject,
      body,
      scheduled_for
    )
    VALUES (
      v_user_id,
      'shift_reminder',
      NEW.shift_id,
      'Reminder: Your upcoming volunteer shift',
      'This is a reminder about your volunteer shift tomorrow. We look forward to seeing you!',
      v_scheduled_time
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically schedule reminders when shift is assigned
DROP TRIGGER IF EXISTS trigger_schedule_shift_reminder ON shift_assignments;
CREATE TRIGGER trigger_schedule_shift_reminder
  AFTER INSERT ON shift_assignments
  FOR EACH ROW
  EXECUTE FUNCTION schedule_shift_reminder();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url) WHERE avatar_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_status ON notification_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_calendar_exports_user_date ON calendar_exports(user_id, exported_at DESC);

-- Add comments for documentation
COMMENT ON TABLE notification_preferences IS 'Granular notification preferences for each user';
COMMENT ON TABLE notification_queue IS 'Queue for scheduled and automated notifications';
COMMENT ON TABLE calendar_exports IS 'Audit log for calendar export operations';
COMMENT ON TABLE pwa_installations IS 'Track PWA installations and usage';
COMMENT ON COLUMN profiles.calendar_sync_token IS 'Secure token for calendar sync URL';
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user profile photo in Supabase Storage';
