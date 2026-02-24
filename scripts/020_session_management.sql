-- Session Management Schema
-- Provides server-side session tracking, audit logging, and security controls

-- Table: user_sessions
-- Tracks all active sessions for users with device/browser metadata
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  device_fingerprint TEXT,
  user_agent TEXT,
  ip_address INET,
  browser_name TEXT,
  os_name TEXT,
  device_type TEXT DEFAULT 'desktop', -- desktop, mobile, tablet
  is_active BOOLEAN DEFAULT true,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT -- 'logout', 'timeout', 'admin_revoke', 'security', 'new_session_limit'
);

-- Table: session_events
-- Audit log for all session-related events
CREATE TABLE IF NOT EXISTS session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'timeout', 'refresh', 'revoke', 'activity'
  event_details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: session_config
-- Global session configuration (admin-configurable)
CREATE TABLE IF NOT EXISTS session_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default session configuration
INSERT INTO session_config (config_key, config_value, description) VALUES
  ('idle_timeout_minutes', '30', 'Minutes of inactivity before session warning'),
  ('absolute_timeout_hours', '8', 'Maximum session duration in hours'),
  ('heartbeat_interval_minutes', '5', 'Interval for session activity heartbeat'),
  ('warn_before_timeout_minutes', '5', 'Minutes before timeout to show warning'),
  ('max_concurrent_sessions', '0', 'Maximum concurrent sessions per user (0 = unlimited)'),
  ('logout_on_browser_close', 'true', 'Whether to logout when browser closes'),
  ('sync_logout_across_tabs', 'true', 'Whether to sync logout across browser tabs')
ON CONFLICT (config_key) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_session_events_user_id ON session_events(user_id);
CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_created ON session_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_events_type ON session_events(event_type);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET 
    is_active = false,
    revoked_at = now(),
    revoked_reason = 'timeout'
  WHERE is_active = true 
    AND expires_at < now();
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke all sessions for a user
CREATE OR REPLACE FUNCTION revoke_all_user_sessions(target_user_id UUID, reason TEXT DEFAULT 'logout')
RETURNS INTEGER AS $$
DECLARE
  revoked_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET 
    is_active = false,
    revoked_at = now(),
    revoked_reason = reason
  WHERE user_id = target_user_id 
    AND is_active = true;
  
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  
  -- Log the revocation event
  INSERT INTO session_events (user_id, event_type, event_details)
  VALUES (target_user_id, 'revoke_all', jsonb_build_object('reason', reason, 'count', revoked_count));
  
  RETURN revoked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if session is valid
CREATE OR REPLACE FUNCTION is_session_valid(token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_sessions
    WHERE session_token = token
      AND is_active = true
      AND expires_at > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity(token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE user_sessions
  SET last_activity_at = now()
  WHERE session_token = token
    AND is_active = true
    AND expires_at > now();
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_config ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own sessions (for logout)
CREATE POLICY "Users can update own sessions" ON user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage all sessions
CREATE POLICY "Service role manages all sessions" ON user_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Users can view their own session events
CREATE POLICY "Users can view own session events" ON session_events
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all session events
CREATE POLICY "Service role manages session events" ON session_events
  FOR ALL USING (auth.role() = 'service_role');

-- Anyone can read session config
CREATE POLICY "Anyone can read session config" ON session_config
  FOR SELECT USING (true);

-- Only admins can update session config
CREATE POLICY "Admins can update session config" ON session_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_all_user_sessions(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_session_valid(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_session_activity(TEXT) TO authenticated;
