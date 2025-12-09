-- =====================================================
-- PRODUCTION SETUP SCRIPT
-- =====================================================
-- Purpose: Configure production environment with correct admin user and shift schedule
-- 
-- What this script does:
-- 1. Updates seed_shifts_range() function to use production times (9am-12pm, 12pm-3pm, 3pm-5pm)
-- 2. Verifies admin user exists and has correct role
-- 3. Cleans up any test/mock data
-- 4. Seeds initial production shifts
--
-- IMPORTANT: This is for PRODUCTION use only. Do not run on test/dev environments.
-- =====================================================

-- Step 1: Update the seed_shifts_range() function to use production shift times
-- Updated shift times from 8am-12pm, 12pm-4pm, 4pm-8pm to 9am-12pm, 12pm-3pm, 3pm-5pm
CREATE OR REPLACE FUNCTION seed_shifts_range(start_date DATE, end_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  curr_date DATE;
  -- Production shift configuration
  shift_slots TEXT[] := ARRAY['AM', 'MID', 'PM'];
  shift_start_times TIME[] := ARRAY['09:00:00', '12:00:00', '15:00:00']; -- 9am, 12pm, 3pm
  shift_end_times TIME[] := ARRAY['12:00:00', '15:00:00', '17:00:00'];   -- 12pm, 3pm, 5pm
  capacity_options INTEGER[] := ARRAY[3, 4, 5]; -- Standard capacities
  i INTEGER;
  idx INTEGER;
BEGIN
  -- Validate date range
  IF start_date > end_date THEN
    RAISE EXCEPTION 'start_date must be before or equal to end_date';
  END IF;

  -- Create unique index if it doesn't exist (prevents duplicate shifts)
  CREATE UNIQUE INDEX IF NOT EXISTS ux_shifts_date_slot ON shifts (shift_date, slot);

  curr_date := start_date;

  -- Loop through each day in the range
  WHILE curr_date <= end_date LOOP
    -- Create 3 shifts per day (AM, MID, PM)
    FOR i IN 1..array_length(shift_slots, 1) LOOP
      -- Calculate capacity index (rotates through capacity_options array)
      idx := ((EXTRACT(DAY FROM curr_date)::integer + i - 1) % array_length(capacity_options, 1)) + 1;

      -- Insert shift (or skip if already exists)
      INSERT INTO shifts (shift_date, slot, start_time, end_time, capacity)
      VALUES (
        curr_date,
        shift_slots[i],
        shift_start_times[i],
        shift_end_times[i],
        capacity_options[idx]
      )
      ON CONFLICT (shift_date, slot) DO NOTHING; -- Skip if shift already exists
    END LOOP;

    -- Move to next day
    curr_date := curr_date + 1;
  END LOOP;

  RAISE NOTICE 'Successfully seeded shifts from % to %', start_date, end_date;
END;
$$;

-- Step 2: Verify admin user profile exists and has correct configuration
-- Note: The user must already exist in auth.users (created via Supabase dashboard)
-- This ensures their profile is set up correctly

DO $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    JOIN auth.users au ON p.id = au.id
    WHERE au.email = 'volunteer@vanderpumpdogs.org'
    AND p.role = 'admin'
    AND p.active = true
  ) INTO admin_exists;

  IF admin_exists THEN
    RAISE NOTICE '✓ Admin user verified: volunteer@vanderpumpdogs.org';
  ELSE
    RAISE WARNING '✗ Admin user not found or not configured correctly';
  END IF;
END $$;

-- Step 3: Clean up any old test data (optional - comment out if you want to keep historical data)
-- Uncomment the following lines if you want to remove old test data:

-- -- Remove shift assignments older than 90 days
-- DELETE FROM shift_assignments
-- WHERE shift_id IN (
--   SELECT id FROM shifts WHERE shift_date < CURRENT_DATE - INTERVAL '90 days'
-- );

-- -- Remove shifts older than 90 days
-- DELETE FROM shifts
-- WHERE shift_date < CURRENT_DATE - INTERVAL '90 days';

-- Step 4: Seed shifts for the next 3 months (if they don't already exist)
-- This ensures there are always shifts available for volunteers to sign up for

DO $$
BEGIN
  -- Cast the interval result to DATE to match function signature
  PERFORM seed_shifts_range(CURRENT_DATE, (CURRENT_DATE + INTERVAL '90 days')::DATE);
  RAISE NOTICE '✓ Production shifts seeded for next 90 days';
END $$;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '  PRODUCTION SETUP COMPLETE ✓';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Admin: volunteer@vanderpumpdogs.org';
  RAISE NOTICE 'Shifts: 9:00 AM - 12:00 PM, 12:00 PM - 3:00 PM, 3:00 PM - 5:00 PM';
  RAISE NOTICE 'Schedule: Next 90 days seeded';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Deploy application to Vercel';
  RAISE NOTICE '2. Test admin login at /auth/login';
  RAISE NOTICE '3. Verify shifts at /admin/shifts';
  RAISE NOTICE '4. Create test volunteer for workflow verification';
  RAISE NOTICE '================================================';
END $$;
