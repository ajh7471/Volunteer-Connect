-- Email System Enhancements - Add Templates and Scheduling
-- Created: 2025-11-08
-- Feature #2: Email Communication System

BEGIN;

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('reminder', 'confirmation', 'promotional', 'urgent', 'welcome')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- e.g., ["firstName", "shiftDate", "shiftTime"]
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);

-- Create scheduled_emails table
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  email_type TEXT NOT NULL,
  recipients JSONB NOT NULL, -- array of user ids
  filter_criteria JSONB, -- email categories, roles, etc.
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Enable RLS on new tables
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_templates (admin only)
CREATE POLICY email_templates_admin_only ON email_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS policies for scheduled_emails (admin only)
CREATE POLICY scheduled_emails_admin_only ON scheduled_emails
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(active);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for) WHERE status = 'pending';

-- Insert default email templates
INSERT INTO email_templates (name, category, subject, body, variables, active) VALUES
('Shift Reminder', 'reminder', 'Reminder: Your shift on {shiftDate}', 
 'Hi {firstName},\n\nThis is a friendly reminder about your upcoming volunteer shift:\n\nDate: {shiftDate}\nTime: {shiftTime}\nLocation: Vanderpump Dogs Foundation\n\nThank you for your dedication!\n\nBest regards,\nThe Vanderpump Dogs Team',
 '["firstName", "shiftDate", "shiftTime"]'::jsonb, true),

('Welcome Email', 'welcome', 'Welcome to Vanderpump Dogs Volunteer Program!',
 'Hi {firstName},\n\nWelcome to the Vanderpump Dogs volunteer family! We''re thrilled to have you join us.\n\nYour account has been created and you can now log in to view available shifts and manage your schedule.\n\nIf you have any questions, please don''t hesitate to reach out.\n\nBest regards,\nThe Vanderpump Dogs Team',
 '["firstName"]'::jsonb, true),

('Shift Confirmation', 'confirmation', 'Shift Confirmed: {shiftDate}',
 'Hi {firstName},\n\nYour volunteer shift has been confirmed!\n\nDate: {shiftDate}\nTime: {shiftTime}\n\nWe look forward to seeing you!\n\nBest regards,\nThe Vanderpump Dogs Team',
 '["firstName", "shiftDate", "shiftTime"]'::jsonb, true),

('Promotional Update', 'promotional', 'Exciting News from Vanderpump Dogs!',
 'Hi {firstName},\n\nWe have some exciting updates to share with you!\n\n{message}\n\nThank you for being part of our community.\n\nBest regards,\nThe Vanderpump Dogs Team',
 '["firstName", "message"]'::jsonb, true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON email_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_emails TO authenticated;

COMMIT;

-- Success notification
DO $$
BEGIN
  RAISE NOTICE 'Email system enhancements applied successfully';
  RAISE NOTICE 'Created tables: email_templates, scheduled_emails';
  RAISE NOTICE 'Inserted 4 default templates';
END $$;
