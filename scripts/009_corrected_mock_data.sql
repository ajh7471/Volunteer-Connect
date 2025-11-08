-- Corrected Comprehensive Mock Data for Testing Admin & Volunteer Workflows
-- Fixed: Renamed 'current_date' variable to 'curr_date' to avoid SQL keyword conflict
-- Adds dedup protection, safer capacity indexing, dynamic month-end, and clearer date increments.

-- Create unique index to avoid duplicate (shift_date, slot). Non-destructive if it already exists.
CREATE UNIQUE INDEX IF NOT EXISTS ux_shifts_date_slot ON shifts (shift_date, slot);

-- Helper DO block generator: generates shifts for January 2025
DO $$
DECLARE
  start_date DATE := DATE '2025-01-01'; -- set month start here
  curr_date DATE; -- Renamed from current_date to avoid SQL keyword conflict
  end_date DATE;
  shift_slots TEXT[] := ARRAY['AM', 'MID', 'PM'];
  shift_start_times TIME[] := ARRAY['08:00:00', '12:00:00', '16:00:00'];
  shift_end_times TIME[] := ARRAY['12:00:00', '16:00:00', '20:00:00'];
  capacity_options INTEGER[] := ARRAY[2, 3, 4, 5];
  i INTEGER;
  idx INTEGER;
BEGIN
  curr_date := start_date;
  end_date := (date_trunc('month', start_date) + INTERVAL '1 month' - INTERVAL '1 day')::date;

  WHILE curr_date <= end_date LOOP
    FOR i IN 1..array_length(shift_slots, 1) LOOP
      -- safe index into capacity_options (handles arbitrary array length)
      idx := ((EXTRACT(DAY FROM curr_date)::integer + i - 1) % array_length(capacity_options, 1)) + 1;

      INSERT INTO shifts (shift_date, slot, start_time, end_time, capacity)
      VALUES (
        curr_date,
        shift_slots[i],
        shift_start_times[i],
        shift_end_times[i],
        capacity_options[idx]
      )
      ON CONFLICT (shift_date, slot) DO NOTHING;
    END LOOP;
    curr_date := curr_date + 1; -- add 1 day, keeps DATE type
  END LOOP;
END $$;

-- February 2025 with different capacity options
DO $$
DECLARE
  start_date DATE := DATE '2025-02-01';
  curr_date DATE; -- Renamed from current_date to avoid SQL keyword conflict
  end_date DATE;
  shift_slots TEXT[] := ARRAY['AM', 'MID', 'PM'];
  shift_start_times TIME[] := ARRAY['08:00:00', '12:00:00', '16:00:00'];
  shift_end_times TIME[] := ARRAY['12:00:00', '16:00:00', '20:00:00'];
  capacity_options INTEGER[] := ARRAY[3, 4, 5, 6];
  i INTEGER;
  idx INTEGER;
BEGIN
  curr_date := start_date;
  end_date := (date_trunc('month', start_date) + INTERVAL '1 month' - INTERVAL '1 day')::date;

  WHILE curr_date <= end_date LOOP
    FOR i IN 1..array_length(shift_slots, 1) LOOP
      idx := ((EXTRACT(DAY FROM curr_date)::integer + i - 1) % array_length(capacity_options, 1)) + 1;

      INSERT INTO shifts (shift_date, slot, start_time, end_time, capacity)
      VALUES (
        curr_date,
        shift_slots[i],
        shift_start_times[i],
        shift_end_times[i],
        capacity_options[idx]
      )
      ON CONFLICT (shift_date, slot) DO NOTHING;
    END LOOP;
    curr_date := curr_date + 1;
  END LOOP;
END $$;

-- March 2025
DO $$
DECLARE
  start_date DATE := DATE '2025-03-01';
  curr_date DATE; -- Renamed from current_date to avoid SQL keyword conflict
  end_date DATE;
  shift_slots TEXT[] := ARRAY['AM', 'MID', 'PM'];
  shift_start_times TIME[] := ARRAY['08:00:00', '12:00:00', '16:00:00'];
  shift_end_times TIME[] := ARRAY['12:00:00', '16:00:00', '20:00:00'];
  capacity_options INTEGER[] := ARRAY[2, 3, 4, 5];
  i INTEGER;
  idx INTEGER;
BEGIN
  curr_date := start_date;
  end_date := (date_trunc('month', start_date) + INTERVAL '1 month' - INTERVAL '1 day')::date;

  WHILE curr_date <= end_date LOOP
    FOR i IN 1..array_length(shift_slots, 1) LOOP
      idx := ((EXTRACT(DAY FROM curr_date)::integer + i - 1) % array_length(capacity_options, 1)) + 1;

      INSERT INTO shifts (shift_date, slot, start_time, end_time, capacity)
      VALUES (
        curr_date,
        shift_slots[i],
        shift_start_times[i],
        shift_end_times[i],
        capacity_options[idx]
      )
      ON CONFLICT (shift_date, slot) DO NOTHING;
    END LOOP;
    curr_date := curr_date + 1;
  END LOOP;
END $$;

-- December 2024 historical data
DO $$
DECLARE
  start_date DATE := DATE '2024-12-01';
  curr_date DATE; -- Renamed from current_date to avoid SQL keyword conflict
  end_date DATE;
  shift_slots TEXT[] := ARRAY['AM', 'MID', 'PM'];
  shift_start_times TIME[] := ARRAY['08:00:00', '12:00:00', '16:00:00'];
  shift_end_times TIME[] := ARRAY['12:00:00', '16:00:00', '20:00:00'];
  i INTEGER;
BEGIN
  curr_date := start_date;
  end_date := (date_trunc('month', start_date) + INTERVAL '1 month' - INTERVAL '1 day')::date;

  WHILE curr_date <= end_date LOOP
    FOR i IN 1..array_length(shift_slots, 1) LOOP
      INSERT INTO shifts (shift_date, slot, start_time, end_time, capacity)
      VALUES (
        curr_date,
        shift_slots[i],
        shift_start_times[i],
        shift_end_times[i],
        3
      )
      ON CONFLICT (shift_date, slot) DO NOTHING;
    END LOOP;
    curr_date := curr_date + 1;
  END LOOP;
END $$;
