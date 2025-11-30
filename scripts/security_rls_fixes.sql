-- Security fixes for RLS policies
-- Run this script to enable RLS on views and tighten security

-- Enable RLS on shift_fill_rates view (was disabled)
-- Note: Views inherit RLS from underlying tables, but we should add explicit protection
ALTER VIEW shift_fill_rates SET (security_invoker = on);

-- Add rate limiting table for auth attempts
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  email text,
  attempt_type text NOT NULL, -- 'login', 'signup', 'password_reset'
  attempted_at timestamp with time zone DEFAULT now(),
  success boolean DEFAULT false
);

-- Index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_ip_time 
ON auth_rate_limits (ip_address, attempted_at);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_email_time 
ON auth_rate_limits (email, attempted_at);

-- Enable RLS on rate limits table
ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limits
CREATE POLICY "auth_rate_limits_service_only" ON auth_rate_limits
FOR ALL USING (false);

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_auth_rate_limit(
  p_ip_address inet,
  p_email text DEFAULT NULL,
  p_attempt_type text DEFAULT 'login',
  p_max_attempts int DEFAULT 5,
  p_window_minutes int DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_count int;
BEGIN
  -- Count recent attempts from this IP
  SELECT COUNT(*) INTO attempt_count
  FROM auth_rate_limits
  WHERE ip_address = p_ip_address
    AND attempt_type = p_attempt_type
    AND attempted_at > now() - (p_window_minutes || ' minutes')::interval
    AND NOT success;

  -- If email provided, also check email-based limits
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
$$;

-- Function to log auth attempt
CREATE OR REPLACE FUNCTION log_auth_attempt(
  p_ip_address inet,
  p_email text,
  p_attempt_type text,
  p_success boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO auth_rate_limits (ip_address, email, attempt_type, success)
  VALUES (p_ip_address, lower(p_email), p_attempt_type, p_success);
  
  -- Clean up old entries (older than 24 hours)
  DELETE FROM auth_rate_limits
  WHERE attempted_at < now() - interval '24 hours';
END;
$$;

-- Tighten profiles RLS - prevent users from updating sensitive fields
DROP POLICY IF EXISTS "profiles_update_own_safe" ON profiles;
CREATE POLICY "profiles_update_own_safe" ON profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND role = (SELECT role FROM profiles WHERE id = auth.uid()) -- Cannot change own role
);

-- Add audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit log
CREATE POLICY "audit_log_admin_read" ON security_audit_log
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user 
ON security_audit_log (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_action 
ON security_audit_log (action, created_at);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_auth_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION log_auth_attempt TO authenticated;
