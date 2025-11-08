-- ============================================================================
-- ADMIN ENHANCEMENT SYSTEM: Database Schema Updates
-- ============================================================================
-- Purpose: This migration adds comprehensive user management, email preferences,
-- and communication tracking capabilities for the admin system.
--
-- Features Added:
-- 1. Email opt-in preferences for volunteers
-- 2. Granular email category preferences (reminders, confirmations, etc.)
-- 3. Email blocklist for preventing specific addresses from registering
-- 4. Email logs for tracking all communications sent
-- 5. Row-level security to ensure only admins can access these features
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1: Email Preferences System
-- ----------------------------------------------------------------------------
-- Add columns to the profiles table to track user email preferences
-- This allows volunteers to opt-in to receiving emails and choose which
-- categories of emails they want to receive

-- Fixed SQL syntax - each ALTER TABLE ADD COLUMN must be separate
-- email_opt_in: Boolean flag indicating if user wants ANY emails at all
-- Default is false (opt-out by default) to respect privacy laws like GDPR
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN DEFAULT false;

-- email_categories: JSON object storing granular email preferences
-- Structure: {"reminders": true, "confirmations": true, "promotional": false, "urgent": true}
-- This gives users fine-grained control over what types of emails they receive
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_categories JSONB DEFAULT '{"reminders": true, "confirmations": true, "promotional": false, "urgent": true}'::jsonb;

-- ----------------------------------------------------------------------------
-- SECTION 2: Email Blocklist System
-- ----------------------------------------------------------------------------
-- Create a table to store email addresses that are blocked from registration
-- Use cases: spam prevention, ban abusive users, prevent known problem accounts

CREATE TABLE IF NOT EXISTS auth_blocklist (
  -- Primary key: the email address to block (stored in lowercase for consistency)
  email TEXT PRIMARY KEY,
  
  -- Foreign key to the admin who blocked this email (for accountability)
  blocked_by UUID REFERENCES profiles(id),
  
  -- Timestamp when the block was created (for audit trail)
  blocked_at TIMESTAMP WITH TIMEZONE DEFAULT NOW(),
  
  -- Optional reason for the block (helps with record-keeping)
  reason TEXT
);

-- Enable Row-Level Security (RLS) on the blocklist
-- This ensures that only authorized users can view/modify blocked emails
ALTER TABLE auth_blocklist ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (for safe re-running of migration)
DROP POLICY IF EXISTS blocklist_admin_only ON auth_blocklist;

-- Create RLS policy: Only admin users can manage the blocklist
-- This policy checks if the current user has role='admin' in their profile
CREATE POLICY blocklist_admin_only ON auth_blocklist
  FOR ALL  -- Applies to SELECT, INSERT, UPDATE, DELETE
  USING (
    -- Subquery checks if current user (auth.uid()) is an admin
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()  -- Match current session user
      AND profiles.role = 'admin'     -- Must have admin role
    )
  );

-- ----------------------------------------------------------------------------
-- SECTION 3: Email Logging System
-- ----------------------------------------------------------------------------
-- Create a table to track all emails sent through the system
-- This provides an audit trail and helps troubleshoot delivery issues

CREATE TABLE IF NOT EXISTS email_logs (
  -- Unique identifier for each email log entry
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- When was the email sent/queued
  sent_at TIMESTAMP WITH TIMEZONE DEFAULT NOW(),
  
  -- Which admin sent the email (for accountability)
  sent_by UUID REFERENCES profiles(id),
  
  -- Who received the email (foreign key to profiles)
  recipient_id UUID REFERENCES profiles(id),
  
  -- Email address (stored separately in case user is deleted)
  recipient_email TEXT,
  
  -- Category of email sent (must match the user's preferences)
  -- Values: 'reminder', 'confirmation', 'promotional', 'urgent'
  email_type TEXT,
  
  -- The subject line of the email
  subject TEXT,
  
  -- Delivery status tracking
  -- 'pending' = queued but not sent yet
  -- 'sent' = successfully delivered
  -- 'failed' = delivery failed
  status TEXT DEFAULT 'pending',
  
  -- If status is 'failed', store the error message here
  error_message TEXT
);

-- Enable Row-Level Security on email logs (admin-only access)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS email_logs_admin_only ON email_logs;

-- Create RLS policy: Only admins can view/manage email logs
-- Same pattern as blocklist - checks for admin role
CREATE POLICY email_logs_admin_only ON email_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- SECTION 4: Performance Optimization
-- ----------------------------------------------------------------------------
-- Create database indexes to speed up common queries

-- Index on recipient_id: Fast lookups of all emails sent to a specific user
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_id);

-- Index on sent_at (descending): Fast sorting of emails by date (newest first)
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);

-- Partial index on email_opt_in: Only indexes users who opted in
-- This makes queries for "opted-in volunteers" much faster
-- Partial indexes are smaller and more efficient than full indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email_opt_in ON profiles(email_opt_in) 
WHERE email_opt_in = true;

-- ----------------------------------------------------------------------------
-- SECTION 5: Permissions
-- ----------------------------------------------------------------------------
-- Grant authenticated users (logged-in) access to these tables
-- The RLS policies above will further restrict what they can actually do

GRANT ALL ON profiles TO authenticated;
GRANT ALL ON auth_blocklist TO authenticated;
GRANT ALL ON email_logs TO authenticated;

-- Note: Even though we grant ALL, the RLS policies ensure only admins
-- can actually perform operations on blocklist and email_logs tables
