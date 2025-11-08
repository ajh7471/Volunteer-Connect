-- Comprehensive Mock Data for Testing Volunteer Connect
-- This script creates realistic test data covering various scenarios

-- =======================
-- MOCK USERS (PROFILES)
-- =======================

-- Admin Users (2)
INSERT INTO profiles (id, name, phone, role, created_at, updated_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Admin Sarah Johnson', '+1-555-0101', 'admin', NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000002', 'Admin Michael Chen', '+1-555-0102', 'admin', NOW(), NOW());

-- Active Volunteers (10)
INSERT INTO profiles (id, name, phone, role, created_at, updated_at) VALUES
  ('v0000000-0000-0000-0000-000000000001', 'Emma Thompson', '+1-555-1001', 'volunteer', NOW(), NOW()),
  ('v0000000-0000-0000-0000-000000000002', 'James Rodriguez', '+1-555-1002', 'volunteer', NOW(), NOW()),
  ('v0000000-0000-0000-0000-000000000003', 'Olivia Martinez', '+1-555-1003', 'volunteer', NOW(), NOW()),
  ('v0000000-0000-0000-0000-000000000004', 'Noah Williams', '+1-555-1004', 'volunteer', NOW(), NOW()),
  ('v0000000-0000-0000-0000-000000000005', 'Sophia Davis', '+1-555-1005', 'volunteer', NOW(), NOW()),
  ('v0000000-0000-0000-0000-000000000006', 'Liam Anderson', '+1-555-1006', 'volunteer', NOW(), NOW()),
  ('v0000000-0000-0000-0000-000000000007', 'Ava Garcia', '+1-555-1007', 'volunteer', NOW(), NOW()),
  ('v0000000-0000-0000-0000-000000000008', 'Ethan Taylor', '+1-555-1008', 'volunteer', NOW(), NOW()),
  ('v0000000-0000-0000-0000-000000000009', 'Isabella White', '+1-555-1009', 'volunteer', NOW(), NOW()),
  ('v0000000-0000-0000-0000-000000000010', 'Mason Brown', '+1-555-1010', 'volunteer', NOW(), NOW());

-- Occasional Volunteers (5)
INSERT INTO profiles (id, name, phone, role, created_at, updated_at) VALUES
  ('v0000000-0000-0000-0000-000000000011', 'Charlotte Lee', '+1-555-1011', 'volunteer', NOW(), NOW()),
  ('v0000000-0000-0000-0000-000000000012', 'Lucas Harris', '+1-555-1012', 'volunteer', NOW(), NOW()),
  ('v0000000-0000-0000-0000-000000000013', 'Amelia Clark', '+1-555-1013', 'volunteer', NOW(), NOW()),
  ('v0000000-0000-0000-0000-000000000014', 'Benjamin Lewis', '+1-555-1014', 'volunteer', NOW(), NOW()),
  ('v0000000-0000-0000-0000-000000000015', 'Mia Robinson', '+1-555-1015', 'volunteer', NOW(), NOW());

-- New Volunteers (3) - Recently joined, minimal activity
INSERT INTO profiles (id, name, phone, role, created_at, updated_at) VALUES
  ('v0000000-0000-0000-0000-000000000016', 'Alexander Walker', '+1-555-1016', 'volunteer', NOW(), NOW()),
  ('v0000000-0000-0000-0000-000000000017', 'Harper Young', '+1-555-1017', 'volunteer', NOW(), NOW()),
  ('v0000000-0000-0000-0000-000000000018', 'Elijah King', '+1-555-1018', 'volunteer', NOW(), NOW());

-- =======================
-- MOCK SHIFTS
-- =======================

-- Past Month Shifts (Last 30 days) - Mix of completed shifts
DO $$
DECLARE
  shift_date DATE;
  shift_slot TEXT;
  shift_id UUID;
BEGIN
  FOR i IN 1..30 LOOP
    shift_date := CURRENT_DATE - INTERVAL '1 day' * (30 - i);
    
    FOREACH shift_slot IN ARRAY ARRAY['AM', 'MID', 'PM']
    LOOP
      shift_id := gen_random_uuid();
      
      INSERT INTO shifts (id, shift_date, slot, start_time, end_time, capacity, created_at)
      VALUES (
        shift_id,
        shift_date,
        shift_slot,
        CASE shift_slot
          WHEN 'AM' THEN '08:00:00'
          WHEN 'MID' THEN '12:00:00'
          WHEN 'PM' THEN '16:00:00'
        END,
        CASE shift_slot
          WHEN 'AM' THEN '12:00:00'
          WHEN 'MID' THEN '16:00:00'
          WHEN 'PM' THEN '20:00:00'
        END,
        CASE 
          WHEN i % 3 = 0 THEN 2  -- Some with capacity 2
          WHEN i % 3 = 1 THEN 3  -- Some with capacity 3
          ELSE 4                  -- Most with capacity 4
        END,
        NOW()
      );
    END LOOP;
  END LOOP;
END $$;

-- Current Month Shifts (Next 30 days) - Partially filled
DO $$
DECLARE
  shift_date DATE;
  shift_slot TEXT;
  shift_id UUID;
BEGIN
  FOR i IN 0..29 LOOP
    shift_date := CURRENT_DATE + INTERVAL '1 day' * i;
    
    FOREACH shift_slot IN ARRAY ARRAY['AM', 'MID', 'PM']
    LOOP
      shift_id := gen_random_uuid();
      
      INSERT INTO shifts (id, shift_date, slot, start_time, end_time, capacity, created_at)
      VALUES (
        shift_id,
        shift_date,
        shift_slot,
        CASE shift_slot
          WHEN 'AM' THEN '08:00:00'
          WHEN 'MID' THEN '12:00:00'
          WHEN 'PM' THEN '16:00:00'
        END,
        CASE shift_slot
          WHEN 'AM' THEN '12:00:00'
          WHEN 'MID' THEN '16:00:00'
          WHEN 'PM' THEN '20:00:00'
        END,
        CASE 
          WHEN i % 4 = 0 THEN 2
          WHEN i % 4 = 1 THEN 3
          WHEN i % 4 = 2 THEN 4
          ELSE 5
        END,
        NOW()
      );
    END LOOP;
  END LOOP;
END $$;

-- =======================
-- MOCK ASSIGNMENTS
-- =======================

-- Past Assignments (Completed shifts)
DO $$
DECLARE
  past_shift RECORD;
  volunteer_ids UUID[] := ARRAY[
    'v0000000-0000-0000-0000-000000000001',
    'v0000000-0000-0000-0000-000000000002',
    'v0000000-0000-0000-0000-000000000003',
    'v0000000-0000-0000-0000-000000000004',
    'v0000000-0000-0000-0000-000000000005',
    'v0000000-0000-0000-0000-000000000006',
    'v0000000-0000-0000-0000-000000000007',
    'v0000000-0000-0000-0000-000000000008',
    'v0000000-0000-0000-0000-000000000009',
    'v0000000-0000-0000-0000-000000000010'
  ];
  volunteers_to_assign INT;
  volunteer_id UUID;
BEGIN
  FOR past_shift IN 
    SELECT id, capacity FROM shifts WHERE shift_date < CURRENT_DATE
  LOOP
    -- Randomly assign 70-100% of capacity to past shifts
    volunteers_to_assign := LEAST(
      past_shift.capacity,
      GREATEST(1, FLOOR(past_shift.capacity * (0.7 + RANDOM() * 0.3)))::INT
    );
    
    FOR i IN 1..volunteers_to_assign LOOP
      volunteer_id := volunteer_ids[1 + FLOOR(RANDOM() * array_length(volunteer_ids, 1))];
      
      INSERT INTO shift_assignments (id, shift_id, user_id, created_at)
      VALUES (
        gen_random_uuid(),
        past_shift.id,
        volunteer_id,
        NOW() - INTERVAL '5 days'
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Future Assignments (Upcoming shifts) - Various scenarios
DO $$
DECLARE
  future_shift RECORD;
  all_volunteers UUID[] := ARRAY[
    'v0000000-0000-0000-0000-000000000001',
    'v0000000-0000-0000-0000-000000000002',
    'v0000000-0000-0000-0000-000000000003',
    'v0000000-0000-0000-0000-000000000004',
    'v0000000-0000-0000-0000-000000000005',
    'v0000000-0000-0000-0000-000000000006',
    'v0000000-0000-0000-0000-000000000007',
    'v0000000-0000-0000-0000-000000000008',
    'v0000000-0000-0000-0000-000000000009',
    'v0000000-0000-0000-0000-000000000010',
    'v0000000-0000-0000-0000-000000000011',
    'v0000000-0000-0000-0000-000000000012',
    'v0000000-0000-0000-0000-000000000016'
  ];
  volunteers_to_assign INT;
  volunteer_id UUID;
  shift_counter INT := 0;
BEGIN
  FOR future_shift IN 
    SELECT id, capacity FROM shifts WHERE shift_date >= CURRENT_DATE ORDER BY shift_date
  LOOP
    shift_counter := shift_counter + 1;
    
    -- Create different scenarios:
    -- 10% fully booked
    -- 15% completely empty
    -- 30% nearly full (1 spot left)
    -- 45% partially filled
    
    IF shift_counter % 10 = 0 THEN
      -- Fully booked shift
      volunteers_to_assign := future_shift.capacity;
    ELSIF shift_counter % 7 = 0 THEN
      -- Empty shift
      volunteers_to_assign := 0;
    ELSIF shift_counter % 3 = 0 THEN
      -- Nearly full (1 spot left)
      volunteers_to_assign := GREATEST(0, future_shift.capacity - 1);
    ELSE
      -- Partially filled (30-70% of capacity)
      volunteers_to_assign := GREATEST(0, FLOOR(future_shift.capacity * (0.3 + RANDOM() * 0.4)))::INT;
    END IF;
    
    FOR i IN 1..volunteers_to_assign LOOP
      volunteer_id := all_volunteers[1 + FLOOR(RANDOM() * array_length(all_volunteers, 1))];
      
      INSERT INTO shift_assignments (id, shift_id, user_id, created_at)
      VALUES (
        gen_random_uuid(),
        future_shift.id,
        volunteer_id,
        NOW() - INTERVAL '1 day' * FLOOR(RANDOM() * 7)
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Specific scenario: Tomorrow has one shift with each scenario
DO $$
DECLARE
  tomorrow_am UUID;
  tomorrow_mid UUID;
  tomorrow_pm UUID;
BEGIN
  -- Get tomorrow's shift IDs
  SELECT id INTO tomorrow_am FROM shifts 
  WHERE shift_date = CURRENT_DATE + INTERVAL '1 day' AND slot = 'AM' LIMIT 1;
  
  SELECT id INTO tomorrow_mid FROM shifts 
  WHERE shift_date = CURRENT_DATE + INTERVAL '1 day' AND slot = 'MID' LIMIT 1;
  
  SELECT id INTO tomorrow_pm FROM shifts 
  WHERE shift_date = CURRENT_DATE + INTERVAL '1 day' AND slot = 'PM' LIMIT 1;
  
  -- AM: Fully booked (capacity 4)
  INSERT INTO shift_assignments (id, shift_id, user_id, created_at) VALUES
    (gen_random_uuid(), tomorrow_am, 'v0000000-0000-0000-0000-000000000001', NOW()),
    (gen_random_uuid(), tomorrow_am, 'v0000000-0000-0000-0000-000000000002', NOW()),
    (gen_random_uuid(), tomorrow_am, 'v0000000-0000-0000-0000-000000000003', NOW()),
    (gen_random_uuid(), tomorrow_am, 'v0000000-0000-0000-0000-000000000004', NOW())
  ON CONFLICT DO NOTHING;
  
  -- MID: Nearly full (3/4)
  INSERT INTO shift_assignments (id, shift_id, user_id, created_at) VALUES
    (gen_random_uuid(), tomorrow_mid, 'v0000000-0000-0000-0000-000000000005', NOW()),
    (gen_random_uuid(), tomorrow_mid, 'v0000000-0000-0000-0000-000000000006', NOW()),
    (gen_random_uuid(), tomorrow_mid, 'v0000000-0000-0000-0000-000000000007', NOW())
  ON CONFLICT DO NOTHING;
  
  -- PM: Empty (available for testing)
  -- No assignments
END $$;

-- =======================
-- EDGE CASES
-- =======================

-- Volunteer with maximum activity (signed up for many shifts)
DO $$
DECLARE
  active_shifts RECORD;
  counter INT := 0;
BEGIN
  FOR active_shifts IN 
    SELECT id FROM shifts 
    WHERE shift_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
    ORDER BY shift_date, slot
  LOOP
    counter := counter + 1;
    EXIT WHEN counter > 15; -- Sign up for 15 shifts
    
    INSERT INTO shift_assignments (id, shift_id, user_id, created_at)
    VALUES (
      gen_random_uuid(),
      active_shifts.id,
      'v0000000-0000-0000-0000-000000000001', -- Emma is super active
      NOW() - INTERVAL '1 day' * (counter % 7)
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- New volunteer with minimal activity (only 1-2 shifts)
INSERT INTO shift_assignments (id, shift_id, user_id, created_at)
SELECT 
  gen_random_uuid(),
  id,
  'v0000000-0000-0000-0000-000000000017', -- Harper is new
  NOW()
FROM shifts
WHERE shift_date = CURRENT_DATE + INTERVAL '7 days' AND slot = 'AM'
LIMIT 1
ON CONFLICT DO NOTHING;

-- =======================
-- SUMMARY
-- =======================

-- Display summary of mock data created
DO $$
DECLARE
  total_users INT;
  total_admins INT;
  total_volunteers INT;
  total_shifts INT;
  total_assignments INT;
  past_shifts INT;
  future_shifts INT;
  filled_spots INT;
  available_spots INT;
BEGIN
  SELECT COUNT(*) INTO total_users FROM profiles;
  SELECT COUNT(*) INTO total_admins FROM profiles WHERE role = 'admin';
  SELECT COUNT(*) INTO total_volunteers FROM profiles WHERE role = 'volunteer';
  SELECT COUNT(*) INTO total_shifts FROM shifts;
  SELECT COUNT(*) INTO past_shifts FROM shifts WHERE shift_date < CURRENT_DATE;
  SELECT COUNT(*) INTO future_shifts FROM shifts WHERE shift_date >= CURRENT_DATE;
  SELECT COUNT(*) INTO total_assignments FROM shift_assignments;
  SELECT SUM(capacity) INTO available_spots FROM shifts WHERE shift_date >= CURRENT_DATE;
  SELECT COUNT(*) INTO filled_spots FROM shift_assignments sa 
    JOIN shifts s ON sa.shift_id = s.id 
    WHERE s.shift_date >= CURRENT_DATE;
  
  RAISE NOTICE '==== MOCK DATA SUMMARY ====';
  RAISE NOTICE 'Total Users: %', total_users;
  RAISE NOTICE '  - Admins: %', total_admins;
  RAISE NOTICE '  - Volunteers: %', total_volunteers;
  RAISE NOTICE '';
  RAISE NOTICE 'Total Shifts: %', total_shifts;
  RAISE NOTICE '  - Past Shifts: %', past_shifts;
  RAISE NOTICE '  - Future Shifts: %', future_shifts;
  RAISE NOTICE '';
  RAISE NOTICE 'Total Assignments: %', total_assignments;
  RAISE NOTICE '  - Future Filled Spots: % / %', filled_spots, available_spots;
  RAISE NOTICE '  - Future Availability: %', (available_spots - filled_spots);
  RAISE NOTICE '===========================';
END $$;
