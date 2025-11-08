-- Admin Enhancement System: User Management, Email Preferences, and Blocklist

-- Add email preferences column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_categories JSONB DEFAULT '{"reminders": true, "confirmations": true, "promotional": false, "urgent": true}'::jsonb;

-- Ensure auth_blocklist has proper structure
CREATE TABLE IF NOT EXISTS auth_blocklist (
  email TEXT PRIMARY KEY,
  blocked_by UUID REFERENCES profiles(id),
  blocked_at TIMESTAMP WITH TIMEZONE DEFAULT NOW(),
  reason TEXT
);

-- Enable RLS on auth_blocklist (admin-only access)
ALTER TABLE auth_blocklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blocklist_admin_only ON auth_blocklist;
CREATE POLICY blocklist_admin_only ON auth_blocklist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create email logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at TIMESTAMP WITH TIMEZONE DEFAULT NOW(),
  sent_by UUID REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),
  recipient_email TEXT,
  email_type TEXT, -- 'reminder', 'confirmation', 'promotional', 'urgent'
  subject TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_logs_admin_only ON email_logs;
CREATE POLICY email_logs_admin_only ON email_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email_opt_in ON profiles(email_opt_in) WHERE email_opt_in = true;

-- Grant admin users ability to manage all tables
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON auth_blocklist TO authenticated;
GRANT ALL ON email_logs TO authenticated;
