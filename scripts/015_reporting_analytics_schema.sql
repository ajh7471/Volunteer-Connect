-- =====================================================
-- SCRIPT 015: REPORTING & ANALYTICS ENHANCEMENTS
-- =====================================================
-- Purpose: Add database views and functions to support reporting
-- 
-- Features:
-- - Volunteer attendance tracking views
-- - Shift fill rate calculations
-- - Performance metrics aggregation
-- - Reporting helper functions
-- 
-- Run this script after: 014_email_service_configuration.sql
-- =====================================================

BEGIN;

-- =====================================================
-- ATTENDANCE TRACKING VIEW
-- =====================================================
-- Provides easy access to volunteer attendance history
CREATE OR REPLACE VIEW volunteer_attendance AS
SELECT 
  sa.id as assignment_id,
  sa.user_id,
  p.name as volunteer_name,
  p.email as volunteer_email,
  s.id as shift_id,
  s.shift_date,
  s.start_time,
  s.end_time,
  s.slot,
  sa.created_at as signed_up_at,
  CASE 
    WHEN s.shift_date < CURRENT_DATE THEN 'Completed'
    WHEN s.shift_date = CURRENT_DATE THEN 'Today'
    ELSE 'Upcoming'
  END as status,
  -- Calculate hours for each shift
  EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600 as hours
FROM shift_assignments sa
JOIN profiles p ON sa.user_id = p.id
JOIN shifts s ON sa.shift_id = s.id;

COMMENT ON VIEW volunteer_attendance IS 'Complete view of volunteer shift assignments with calculated status and hours';

-- =====================================================
-- SHIFT FILL RATES VIEW
-- =====================================================
-- Provides shift capacity and fill rate statistics
CREATE OR REPLACE VIEW shift_fill_rates AS
SELECT 
  s.id as shift_id,
  s.shift_date,
  s.start_time,
  s.end_time,
  s.slot,
  s.capacity,
  COUNT(sa.id) as filled_count,
  ROUND((COUNT(sa.id)::numeric / NULLIF(s.capacity, 0)) * 100, 1) as fill_rate_percent,
  s.capacity - COUNT(sa.id) as spots_remaining,
  CASE 
    WHEN COUNT(sa.id) = s.capacity THEN 'Full'
    WHEN COUNT(sa.id) > 0 THEN 'Partial'
    ELSE 'Empty'
  END as fill_status,
  -- Aggregate volunteer names
  STRING_AGG(p.name, ', ' ORDER BY sa.created_at) as volunteer_names
FROM shifts s
LEFT JOIN shift_assignments sa ON s.id = sa.shift_id
LEFT JOIN profiles p ON sa.user_id = p.id
GROUP BY s.id, s.shift_date, s.start_time, s.end_time, s.slot, s.capacity;

COMMENT ON VIEW shift_fill_rates IS 'Shift capacity statistics with fill rates and volunteer names';

-- =====================================================
-- REPORTING FUNCTIONS
-- =====================================================

-- Function: Calculate total volunteer hours for a user in date range
CREATE OR REPLACE FUNCTION calculate_volunteer_hours(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_hours NUMERIC,
  shift_count INTEGER,
  hours_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600)::NUMERIC as total_hours,
    COUNT(*)::INTEGER as shift_count,
    jsonb_agg(
      jsonb_build_object(
        'date', s.shift_date,
        'slot', s.slot,
        'hours', EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600
      ) ORDER BY s.shift_date
    ) as hours_breakdown
  FROM shift_assignments sa
  JOIN shifts s ON sa.shift_id = s.id
  WHERE sa.user_id = p_user_id
    AND s.shift_date BETWEEN p_start_date AND p_end_date
    AND s.shift_date <= CURRENT_DATE; -- Only completed shifts
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_volunteer_hours IS 'Calculate total hours worked by a volunteer in a date range';

-- Function: Get shift fill rate statistics for a date range
CREATE OR REPLACE FUNCTION get_shift_statistics(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_shifts INTEGER,
  avg_fill_rate NUMERIC,
  full_shifts INTEGER,
  partial_shifts INTEGER,
  empty_shifts INTEGER,
  total_capacity INTEGER,
  total_filled INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_shifts,
    ROUND(AVG(fill_rate_percent), 1) as avg_fill_rate,
    COUNT(*) FILTER (WHERE fill_status = 'Full')::INTEGER as full_shifts,
    COUNT(*) FILTER (WHERE fill_status = 'Partial')::INTEGER as partial_shifts,
    COUNT(*) FILTER (WHERE fill_status = 'Empty')::INTEGER as empty_shifts,
    SUM(capacity)::INTEGER as total_capacity,
    SUM(filled_count)::INTEGER as total_filled
  FROM shift_fill_rates
  WHERE shift_date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_shift_statistics IS 'Get aggregate statistics for shifts in a date range';

-- Function: Get most active volunteers in a period
CREATE OR REPLACE FUNCTION get_active_volunteers(
  p_start_date DATE,
  p_end_date DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  volunteer_name TEXT,
  volunteer_email TEXT,
  shift_count INTEGER,
  total_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    va.user_id,
    va.volunteer_name,
    va.volunteer_email,
    COUNT(*)::INTEGER as shift_count,
    SUM(va.hours)::NUMERIC as total_hours
  FROM volunteer_attendance va
  WHERE va.shift_date BETWEEN p_start_date AND p_end_date
    AND va.status = 'Completed'
  GROUP BY va.user_id, va.volunteer_name, va.volunteer_email
  ORDER BY shift_count DESC, total_hours DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_active_volunteers IS 'Get most active volunteers ranked by shift count and hours';

-- Function: Get popular time slots
CREATE OR REPLACE FUNCTION get_popular_time_slots()
RETURNS TABLE (
  slot TEXT,
  total_shifts INTEGER,
  avg_fill_rate NUMERIC,
  total_volunteers INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sfr.slot,
    COUNT(*)::INTEGER as total_shifts,
    ROUND(AVG(sfr.fill_rate_percent), 1) as avg_fill_rate,
    SUM(sfr.filled_count)::INTEGER as total_volunteers
  FROM shift_fill_rates sfr
  GROUP BY sfr.slot
  ORDER BY avg_fill_rate DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_popular_time_slots IS 'Get time slot popularity statistics';

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for volunteer attendance queries
CREATE INDEX IF NOT EXISTS idx_shift_assignments_user_date 
ON shift_assignments(user_id, created_at DESC);

-- Index for shift date range queries
CREATE INDEX IF NOT EXISTS idx_shifts_date_range 
ON shifts(shift_date, start_time);

-- Index for reporting queries joining shifts and assignments
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift_created 
ON shift_assignments(shift_id, created_at);

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant select on views to authenticated users
GRANT SELECT ON volunteer_attendance TO authenticated;
GRANT SELECT ON shift_fill_rates TO authenticated;

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION calculate_volunteer_hours TO authenticated;
GRANT EXECUTE ON FUNCTION get_shift_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_volunteers TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_time_slots TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  -- Verify views exist
  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'volunteer_attendance') THEN
    RAISE EXCEPTION 'View volunteer_attendance was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'shift_fill_rates') THEN
    RAISE EXCEPTION 'View shift_fill_rates was not created';
  END IF;
  
  -- Verify functions exist
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_volunteer_hours') THEN
    RAISE EXCEPTION 'Function calculate_volunteer_hours was not created';
  END IF;
  
  RAISE NOTICE '✓ All reporting views and functions created successfully';
  RAISE NOTICE '✓ Indexes created for performance optimization';
  RAISE NOTICE '✓ Script 015 completed successfully';
END $$;

COMMIT;
