-- Comprehensive Mock Data for Testing Admin & Volunteer Workflows
-- This script creates realistic shift data for testing
-- Note: Users must be created through the signup UI (Supabase Auth requirement)

-- Clean up existing test data (optional - comment out if you want to preserve data)
-- DELETE FROM shift_assignments;
-- DELETE FROM shifts WHERE shift_date >= '2025-01-01';

-- Generate shifts for January 2025 (Current/Future Testing)
DO $$
DECLARE
  current_date DATE := '2025-01-01';
  end_date DATE := '2025-01-31';
  shift_slots TEXT[] := ARRAY['AM', 'MID', 'PM'];
  shift_start_times TIME[] := ARRAY['08:00:00', '12:00:00', '16:00:00'];
  shift_end_times TIME[] := ARRAY['12:00:00', '16:00:00', '20:00:00'];
  capacity_options INTEGER[] := ARRAY[2, 3, 4, 5];
  i INTEGER;
BEGIN
  WHILE current_date <= end_date LOOP
    FOR i IN 1..3 LOOP
      INSERT INTO shifts (shift_date, slot, start_time, end_time, capacity)
      VALUES (
        current_date,
        shift_slots[i],
        shift_start_times[i],
        shift_end_times[i],
        capacity_options[(EXTRACT(DAY FROM current_date)::INTEGER + i) % 4 + 1]
      );
    END LOOP;
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END $$;

-- Generate shifts for February 2025
DO $$
DECLARE
  current_date DATE := '2025-02-01';
  end_date DATE := '2025-02-28';
  shift_slots TEXT[] := ARRAY['AM', 'MID', 'PM'];
  shift_start_times TIME[] := ARRAY['08:00:00', '12:00:00', '16:00:00'];
  shift_end_times TIME[] := ARRAY['12:00:00', '16:00:00', '20:00:00'];
  capacity_options INTEGER[] := ARRAY[3, 4, 5, 6];
  i INTEGER;
BEGIN
  WHILE current_date <= end_date LOOP
    FOR i IN 1..3 LOOP
      INSERT INTO shifts (shift_date, slot, start_time, end_time, capacity)
      VALUES (
        current_date,
        shift_slots[i],
        shift_start_times[i],
        shift_end_times[i],
        capacity_options[(EXTRACT(DAY FROM current_date)::INTEGER + i) % 4 + 1]
      );
    END LOOP;
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END $$;

-- Generate shifts for March 2025
DO $$
DECLARE
  current_date DATE := '2025-03-01';
  end_date DATE := '2025-03-31';
  shift_slots TEXT[] := ARRAY['AM', 'MID', 'PM'];
  shift_start_times TIME[] := ARRAY['08:00:00', '12:00:00', '16:00:00'];
  shift_end_times TIME[] := ARRAY['12:00:00', '16:00:00', '20:00:00'];
  capacity_options INTEGER[] := ARRAY[2, 3, 4, 5];
  i INTEGER;
BEGIN
  WHILE current_date <= end_date LOOP
    FOR i IN 1..3 LOOP
      INSERT INTO shifts (shift_date, slot, start_time, end_time, capacity)
      VALUES (
        current_date,
        shift_slots[i],
        shift_start_times[i],
        shift_end_times[i],
        capacity_options[(EXTRACT(DAY FROM current_date)::INTEGER + i) % 4 + 1]
      );
    END LOOP;
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END $$;

-- Generate historical shifts for December 2024 (Past Data Testing)
DO $$
DECLARE
  current_date DATE := '2024-12-01';
  end_date DATE := '2024-12-31';
  shift_slots TEXT[] := ARRAY['AM', 'MID', 'PM'];
  shift_start_times TIME[] := ARRAY['08:00:00', '12:00:00', '16:00:00'];
  shift_end_times TIME[] := ARRAY['12:00:00', '16:00:00', '20:00:00'];
  i INTEGER;
BEGIN
  WHILE current_date <= end_date LOOP
    FOR i IN 1..3 LOOP
      INSERT INTO shifts (shift_date, slot, start_time, end_time, capacity)
      VALUES (
        current_date,
        shift_slots[i],
        shift_start_times[i],
        shift_end_times[i],
        3
      );
    END LOOP;
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END $$;
