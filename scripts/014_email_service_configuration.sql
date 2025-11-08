-- Email Service Configuration System
-- Feature: Admin email service provider management (SendGrid/Gmail OAuth)
-- Created: 2025-11-08

BEGIN;

-- Create email_service_config table for storing service credentials
CREATE TABLE IF NOT EXISTS email_service_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL CHECK (service_name IN ('sendgrid', 'gmail')),
  is_active BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 1, -- Lower number = higher priority for fallback
  
  -- SendGrid configuration
  sendgrid_api_key TEXT,
  sendgrid_from_email TEXT,
  sendgrid_from_name TEXT,
  
  -- Gmail OAuth configuration
  gmail_client_id TEXT,
  gmail_client_secret TEXT,
  gmail_refresh_token TEXT,
  gmail_access_token TEXT,
  gmail_token_expiry TIMESTAMP WITH TIME ZONE,
  gmail_from_email TEXT,
  
  -- Validation and status
  is_validated BOOLEAN DEFAULT false,
  last_validated_at TIMESTAMP WITH TIME ZONE,
  validation_error TEXT,
  
  -- Usage tracking
  emails_sent_count INTEGER DEFAULT 0,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure only one active service of each type
  UNIQUE(service_name)
);

-- Enable RLS
ALTER TABLE email_service_config ENABLE ROW LEVEL SECURITY;

-- RLS policy: admin only access
CREATE POLICY email_service_config_admin_only ON email_service_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_service_active ON email_service_config(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_email_service_validated ON email_service_config(is_validated) WHERE is_active = true;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON email_service_config TO authenticated;

COMMIT;

-- Success notification
DO $$
BEGIN
  RAISE NOTICE 'Email service configuration system created successfully';
  RAISE NOTICE 'Table created: email_service_config';
  RAISE NOTICE 'Supports: SendGrid API and Gmail OAuth';
END $$;
