-- Fix RLS policies for user_sessions and session_events tables.
-- The original migration only allowed INSERT via service_role, but the API routes
-- use the anon key with the user's JWT, so authenticated users need INSERT and DELETE
-- policies scoped to their own rows.

-- Allow authenticated users to INSERT their own sessions
CREATE POLICY "Users can insert own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to DELETE their own sessions (cleanup)
CREATE POLICY "Users can delete own sessions" ON user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Allow authenticated users to INSERT their own session events
CREATE POLICY "Users can insert own session events" ON session_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
