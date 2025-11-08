-- Advanced Shift Management Schema
-- Feature #5: Recurring Templates, Waitlist, Swapping, Emergency Coverage

BEGIN;

-- ============================================
-- 1. SHIFT TEMPLATES TABLE
-- ============================================
-- Stores reusable shift patterns for recurring schedules

CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  slot TEXT CHECK (slot IN ('AM', 'MID', 'PM')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER DEFAULT 5 CHECK (capacity > 0 AND capacity <= 20),
  recurrence_pattern TEXT DEFAULT 'weekly' CHECK (recurrence_pattern IN ('weekly', 'monthly', 'custom')),
  days_of_week INTEGER[] CHECK (array_length(days_of_week, 1) > 0), -- [0-6] for Sunday-Saturday
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. SHIFT WAITLIST TABLE
-- ============================================
-- Allows volunteers to join waitlist when shifts are full

CREATE TABLE IF NOT EXISTS shift_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Notification expires after 48 hours
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'converted', 'expired', 'cancelled')),
  UNIQUE(shift_id, user_id)
);

-- ============================================
-- 3. SHIFT SWAP REQUESTS TABLE
-- ============================================
-- Enables volunteers to request shift swaps with approval

CREATE TABLE IF NOT EXISTS shift_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_assignment_id UUID REFERENCES shift_assignments(id) ON DELETE CASCADE NOT NULL,
  requesting_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  admin_approved BOOLEAN DEFAULT false,
  admin_approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_approved_at TIMESTAMPTZ
);

-- ============================================
-- 4. EMERGENCY COVERAGE REQUESTS TABLE
-- ============================================
-- Allows admins to request immediate coverage for unfilled shifts

CREATE TABLE IF NOT EXISTS emergency_coverage_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  reason TEXT,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled', 'expired')),
  filled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  notification_sent BOOLEAN DEFAULT false
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_coverage_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Shift Templates: Admin only for write, all authenticated for read active templates
CREATE POLICY shift_templates_admin_write ON shift_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY shift_templates_read ON shift_templates
  FOR SELECT USING (active = true OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Shift Waitlist: Users can read/write their own, admins can see all
CREATE POLICY shift_waitlist_own_access ON shift_waitlist
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY shift_waitlist_admin_access ON shift_waitlist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Shift Swap Requests: Users involved in swap can access, admins can see all
CREATE POLICY shift_swap_own_access ON shift_swap_requests
  FOR ALL USING (
    requesting_user_id = auth.uid() OR target_user_id = auth.uid()
  );

CREATE POLICY shift_swap_admin_access ON shift_swap_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Emergency Coverage: Admins can write, all authenticated can read open requests
CREATE POLICY emergency_coverage_admin_write ON emergency_coverage_requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY emergency_coverage_admin_update ON emergency_coverage_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY emergency_coverage_read_open ON emergency_coverage_requests
  FOR SELECT USING (status = 'open' OR filled_by = auth.uid());

CREATE POLICY emergency_coverage_volunteer_claim ON emergency_coverage_requests
  FOR UPDATE USING (status = 'open' AND filled_by IS NULL)
  WITH CHECK (filled_by = auth.uid());

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_shift_templates_active ON shift_templates(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_shift_templates_recurrence ON shift_templates(recurrence_pattern, active);

CREATE INDEX IF NOT EXISTS idx_shift_waitlist_shift ON shift_waitlist(shift_id, position) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_shift_waitlist_user ON shift_waitlist(user_id, status);
CREATE INDEX IF NOT EXISTS idx_shift_waitlist_notified ON shift_waitlist(notified_at) WHERE status = 'notified';

CREATE INDEX IF NOT EXISTS idx_shift_swap_status ON shift_swap_requests(status) WHERE status IN ('pending', 'accepted');
CREATE INDEX IF NOT EXISTS idx_shift_swap_requesting ON shift_swap_requests(requesting_user_id, status);
CREATE INDEX IF NOT EXISTS idx_shift_swap_target ON shift_swap_requests(target_user_id, status);

CREATE INDEX IF NOT EXISTS idx_emergency_coverage_status ON emergency_coverage_requests(status, urgency) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_emergency_coverage_shift ON emergency_coverage_requests(shift_id, status);
CREATE INDEX IF NOT EXISTS idx_emergency_coverage_expires ON emergency_coverage_requests(expires_at) WHERE status = 'open';

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to apply template and generate shifts for date range
CREATE OR REPLACE FUNCTION apply_shift_template(
  template_id_param UUID,
  start_date_param DATE,
  end_date_param DATE
)
RETURNS TABLE(shifts_created INTEGER) AS $$
DECLARE
  template_record RECORD;
  current_date DATE;
  day_of_week INTEGER;
  shifts_count INTEGER := 0;
BEGIN
  -- Get template details
  SELECT * INTO template_record FROM shift_templates WHERE id = template_id_param AND active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;

  -- Loop through date range
  current_date := start_date_param;
  WHILE current_date <= end_date_param LOOP
    day_of_week := EXTRACT(DOW FROM current_date)::INTEGER;
    
    -- Check if this day of week is in the template
    IF day_of_week = ANY(template_record.days_of_week) THEN
      -- Insert shift if it doesn't already exist
      INSERT INTO shifts (shift_date, slot, start_time, end_time, capacity)
      VALUES (
        current_date,
        template_record.slot,
        template_record.start_time,
        template_record.end_time,
        template_record.capacity
      )
      ON CONFLICT (shift_date, slot) DO NOTHING;
      
      IF FOUND THEN
        shifts_count := shifts_count + 1;
      END IF;
    END IF;
    
    current_date := current_date + INTERVAL '1 day';
  END LOOP;

  RETURN QUERY SELECT shifts_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process waitlist when spot opens
CREATE OR REPLACE FUNCTION process_waitlist(shift_id_param UUID)
RETURNS VOID AS $$
DECLARE
  waitlist_record RECORD;
  available_spots INTEGER;
BEGIN
  -- Calculate available spots
  SELECT s.capacity - COUNT(sa.id) INTO available_spots
  FROM shifts s
  LEFT JOIN shift_assignments sa ON s.id = sa.shift_id
  WHERE s.id = shift_id_param
  GROUP BY s.capacity;

  -- Notify people on waitlist if spots available
  FOR waitlist_record IN
    SELECT * FROM shift_waitlist
    WHERE shift_id = shift_id_param
      AND status = 'waiting'
    ORDER BY position
    LIMIT available_spots
  LOOP
    -- Update status to notified
    UPDATE shift_waitlist
    SET status = 'notified',
        notified_at = NOW(),
        expires_at = NOW() + INTERVAL '48 hours'
    WHERE id = waitlist_record.id;

    -- Create notification
    INSERT INTO notification_queue (user_id, shift_id, notification_type, subject, body, scheduled_for)
    VALUES (
      waitlist_record.user_id,
      shift_id_param,
      'waitlist_spot_available',
      'Shift Spot Available!',
      'A spot has opened up for a shift you''re waitlisted for. You have 48 hours to claim it.',
      NOW()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT, INSERT, UPDATE ON shift_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shift_waitlist TO authenticated;
GRANT SELECT, INSERT, UPDATE ON shift_swap_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON emergency_coverage_requests TO authenticated;

GRANT EXECUTE ON FUNCTION apply_shift_template TO authenticated;
GRANT EXECUTE ON FUNCTION process_waitlist TO authenticated;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Advanced Shift Management schema created successfully';
  RAISE NOTICE 'Tables created: shift_templates, shift_waitlist, shift_swap_requests, emergency_coverage_requests';
  RAISE NOTICE 'Functions created: apply_shift_template, process_waitlist';
  RAISE NOTICE 'RLS policies enabled on all tables';
END $$;

COMMIT;
