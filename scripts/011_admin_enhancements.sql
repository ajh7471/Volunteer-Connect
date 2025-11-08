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
--
-- Transaction Safety: Wrapped in BEGIN/COMMIT to ensure atomic execution
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- SECTION 1: Create Email Status Enum
-- ----------------------------------------------------------------------------
-- Create an enum type for email delivery status tracking
-- Enums provide type safety and prevent invalid status values

DO $$
BEGIN
  -- Check if the enum type already exists to avoid errors on re-run
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_status') THEN
    -- Create the enum with three valid states
    CREATE TYPE public.email_status AS ENUM ('pending','sent','failed');
  END IF;
END$$;

-- ----------------------------------------------------------------------------
-- SECTION 2: Email Preferences System
-- ----------------------------------------------------------------------------
-- Add columns to the profiles table to track user email preferences
-- This allows volunteers to opt-in to receiving emails and choose which
-- categories of emails they want to receive

-- Add both columns in a single ALTER TABLE statement (more efficient)
ALTER TABLE public.profiles
  -- email_opt_in: Boolean flag indicating if user wants ANY emails at all
  -- Default is false (opt-out by default) to respect privacy laws like GDPR
  ADD COLUMN IF NOT EXISTS email_opt_in boolean NOT NULL DEFAULT false,
  
  -- email_categories: JSON object storing granular email preferences
  -- Structure: {"reminders": true, "confirmations": true, "promotional": false, "urgent": true}
  -- This gives users fine-grained control over what types of emails they receive
  ADD COLUMN IF NOT EXISTS email_categories jsonb NOT NULL DEFAULT '{"reminders": true, "confirmations": true, "promotional": false, "urgent": true}'::jsonb;

-- ----------------------------------------------------------------------------
-- SECTION 3: Email Blocklist System Enhancement
-- ----------------------------------------------------------------------------
-- Add tracking columns to existing auth_blocklist table
-- These columns provide accountability and audit trail for blocked emails

ALTER TABLE public.auth_blocklist
  -- Foreign key to the admin who blocked this email (for accountability)
  ADD COLUMN IF NOT EXISTS blocked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Timestamp when the block was created (for audit trail)
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz DEFAULT now(),
  
  -- Optional reason for the block (helps with record-keeping)
  ADD COLUMN IF NOT EXISTS reason text;

-- Enable Row-Level Security (RLS) on the blocklist
-- This ensures that only authorized users can view/modify blocked emails
ALTER TABLE public.auth_blocklist ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (for safe re-running of migration)
DROP POLICY IF EXISTS blocklist_admin_only ON public.auth_blocklist;

-- Create RLS policy: Only admin users can manage the blocklist
-- This policy checks if the current user has role='admin' in their profile
CREATE POLICY blocklist_admin_only ON public.auth_blocklist
  FOR ALL  -- Applies to SELECT, INSERT, UPDATE, DELETE
  TO authenticated  -- Only applies to logged-in users
  USING (
    -- Subquery checks if current user (auth.uid()) is an admin
    EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin')
  )
  WITH CHECK (
    -- Same check for INSERT/UPDATE operations
    EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- SECTION 4: Email Logging System
-- ----------------------------------------------------------------------------
-- Create a table to track all emails sent through the system
-- This provides an audit trail and helps troubleshoot delivery issues

CREATE TABLE IF NOT EXISTS public.email_logs (
  -- Unique identifier for each email log entry
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- When was the email sent/queued
  sent_at timestamptz DEFAULT now(),
  
  -- Which admin sent the email (for accountability)
  sent_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Who received the email (foreign key to profiles)
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Email address using citext for case-insensitive comparison
  recipient_email citext,
  
  -- Category of email sent (must match the user's preferences)
  -- Values: 'reminder', 'confirmation', 'promotional', 'urgent'
  email_type text,
  
  -- The subject line of the email
  subject text,
  
  -- Delivery status tracking (will be converted to enum type)
  status text DEFAULT 'pending',
  
  -- If status is 'failed', store the error message here
  error_message text
);

-- Enable Row-Level Security on email logs (admin-only access)
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS email_logs_admin_only ON public.email_logs;

-- Create RLS policy: Only admins can view/manage email logs
-- Same pattern as blocklist - checks for admin role
CREATE POLICY email_logs_admin_only ON public.email_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- SECTION 5: Performance Optimization
-- ----------------------------------------------------------------------------
-- Create database indexes to speed up common queries

-- Index on recipient_id: Fast lookups of all emails sent to a specific user
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_id);

-- Index on sent_at (descending): Fast sorting of emails by date (newest first)
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);

-- Partial index on email_opt_in: Only indexes users who opted in
-- This makes queries for "opted-in volunteers" much faster
-- Partial indexes are smaller and more efficient than full indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email_opt_in ON public.profiles(email_opt_in) 
WHERE email_opt_in = true;

-- ----------------------------------------------------------------------------
-- SECTION 6: Convert Status Column to Enum Type
-- ----------------------------------------------------------------------------
-- Safely convert the status column from text to enum type
-- This provides type safety and better query performance

-- First, check if there are any invalid status values that would break the conversion
CREATE TEMP TABLE tmp_bad_statuses AS
SELECT DISTINCT status FROM public.email_logs 
WHERE status IS NOT NULL 
  AND status NOT IN ('pending','sent','failed');

-- Only perform the conversion if all existing values are valid
DO $$
DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM tmp_bad_statuses;
  IF cnt = 0 THEN
    -- Step 1: Drop the default value constraint
    ALTER TABLE public.email_logs ALTER COLUMN status DROP DEFAULT;
    
    -- Step 2: Convert the column type from text to enum
    ALTER TABLE public.email_logs ALTER COLUMN status TYPE public.email_status 
      USING status::public.email_status;
    
    -- Step 3: Restore the default value
    ALTER TABLE public.email_logs ALTER COLUMN status SET DEFAULT 'pending';
  END IF;
END$$;

-- ----------------------------------------------------------------------------
-- SECTION 7: Permissions
-- ----------------------------------------------------------------------------
-- Grant authenticated users (logged-in) access to these tables
-- The RLS policies above will further restrict what they can actually do

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.auth_blocklist TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.email_logs TO authenticated;

-- Note: Even though we grant permissions, the RLS policies ensure only admins
-- can actually perform operations on blocklist and email_logs tables

COMMIT;
