-- Remove Shift Swap Functionality
-- This script removes the shift swap feature from the application

BEGIN;

-- ============================================
-- REMOVE SWAP FUNCTIONALITY
-- ============================================

-- Drop RLS policies for shift_swap_requests table
DROP POLICY IF EXISTS shift_swap_own_access ON shift_swap_requests;
DROP POLICY IF EXISTS shift_swap_admin_access ON shift_swap_requests;

-- Drop indexes
DROP INDEX IF EXISTS idx_shift_swap_status;
DROP INDEX IF EXISTS idx_shift_swap_requesting;
DROP INDEX IF EXISTS idx_shift_swap_target;

-- Drop the shift_swap_requests table
DROP TABLE IF EXISTS shift_swap_requests CASCADE;

-- Remove swap-related notifications from notification_queue
DELETE FROM notification_queue 
WHERE notification_type IN (
  'shift_swap_request',
  'shift_swap_accepted',
  'shift_swap_completed'
);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Shift swap functionality removed successfully';
  RAISE NOTICE 'Dropped table: shift_swap_requests';
  RAISE NOTICE 'Removed swap-related notifications from queue';
  RAISE NOTICE 'All swap-related data has been permanently deleted';
END $$;

COMMIT;
