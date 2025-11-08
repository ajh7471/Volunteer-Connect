-- Comprehensive Mock Data for Volunteer Connect
-- This script creates realistic test shifts for testing the application
-- Note: User profiles must be created through the signup flow as they require Supabase Auth

-- Clear existing test data (optional - comment out if you want to keep existing data)
-- TRUNCATE shift_assignments CASCADE;
-- DELETE FROM shifts WHERE shift_date >= '2024-01-01';

-- =======================
-- MOCK SHIFTS
-- =======================

-- Insert shifts for January 2025 through March 2025
-- This provides 3 months of test data with various scenarios

-- Generate shifts for January through March 2025
DO $$
DECLARE
  current_date DATE;
BEGIN
  -- Generate shifts for January through March 2025
  current_date := '2025-01-01'::DATE;
  
  WHILE current_date <= '2025-03-31'::DATE LOOP
    -- Morning shift (7:00 AM - 12:00 PM)
    INSERT INTO shifts (id, shift_date, slot, start_time, end_time, capacity, created_at)
    VALUES (
      gen_random_uuid(),
      current_date,
      'AM',
      '07:00:00',
      '12:00:00',
      CASE 
        WHEN EXTRACT(DOW FROM current_date) IN (0, 6) THEN 8  -- Weekends: higher capacity
        ELSE 5  -- Weekdays: standard capacity
      END,
      NOW()
    );
    
    -- Mid-day shift (12:00 PM - 5:00 PM)
    INSERT INTO shifts (id, shift_date, slot, start_time, end_time, capacity, created_at)
    VALUES (
      gen_random_uuid(),
      current_date,
      'MID',
      '12:00:00',
      '17:00:00',
      CASE 
        WHEN EXTRACT(DOW FROM current_date) IN (0, 6) THEN 8
        ELSE 5
      END,
      NOW()
    );
    
    -- Evening shift (5:00 PM - 9:00 PM)
    INSERT INTO shifts (id, shift_date, slot, start_time, end_time, capacity, created_at)
    VALUES (
      gen_random_uuid(),
      current_date,
      'PM',
      '17:00:00',
      '21:00:00',
      CASE 
        WHEN EXTRACT(DOW FROM current_date) IN (0, 6) THEN 6
        ELSE 4
      END,
      NOW()
    );
    
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END $$;

-- Add some past shifts for December 2024 (for historical testing)
DO $$
DECLARE
  current_date DATE;
BEGIN
  current_date := '2024-12-01'::DATE;
  
  WHILE current_date <= '2024-12-31'::DATE LOOP
    INSERT INTO shifts (id, shift_date, slot, start_time, end_time, capacity, created_at)
    VALUES 
      (gen_random_uuid(), current_date, 'AM', '07:00:00', '12:00:00', 5, NOW()),
      (gen_random_uuid(), current_date, 'MID', '12:00:00', '17:00:00', 5, NOW()),
      (gen_random_uuid(), current_date, 'PM', '17:00:00', '21:00:00', 4, NOW());
    
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END $$;

-- =======================
-- SUMMARY
-- =======================

-- Display summary of mock data created
DO $$
DECLARE
  total_shifts INT;
  past_shifts INT;
  future_shifts INT;
  total_capacity INT;
BEGIN
  SELECT COUNT(*) INTO total_shifts FROM shifts;
  SELECT COUNT(*) INTO past_shifts FROM shifts WHERE shift_date < CURRENT_DATE;
  SELECT COUNT(*) INTO future_shifts FROM shifts WHERE shift_date >= CURRENT_DATE;
  SELECT SUM(capacity) INTO total_capacity FROM shifts WHERE shift_date >= CURRENT_DATE;
  
  RAISE NOTICE '==== MOCK DATA SUMMARY ====';
  RAISE NOTICE 'Total Shifts Created: %', total_shifts;
  RAISE NOTICE '  - Past Shifts (Dec 2024): %', past_shifts;
  RAISE NOTICE '  - Future Shifts (Jan-Mar 2025): %', future_shifts;
  RAISE NOTICE '';
  RAISE NOTICE 'Total Future Capacity: % volunteer spots', total_capacity;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Create test users through the signup flow';
  RAISE NOTICE '2. Set admin roles in Supabase dashboard';
  RAISE NOTICE '3. Start signing up for shifts to test workflows';
  RAISE NOTICE '===========================';
END $$;

-- Verify the data was created
SELECT 
  COUNT(*) as total_shifts,
  MIN(shift_date) as earliest_shift,
  MAX(shift_date) as latest_shift,
  SUM(capacity) as total_capacity
FROM shifts;

SELECT 
  slot,
  COUNT(*) as count,
  AVG(capacity)::NUMERIC(10,1) as avg_capacity
FROM shifts
GROUP BY slot
ORDER BY slot;
