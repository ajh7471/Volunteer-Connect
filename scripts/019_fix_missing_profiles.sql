-- Fix Missing User Profiles
-- This script creates profiles for any auth users that don't have one

-- Insert profiles for auth users that are missing profiles
INSERT INTO profiles (id, email, name, role, created_at, updated_at, active, email_opt_in)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  'volunteer' as role,
  NOW() as created_at,
  NOW() as updated_at,
  true as active,
  true as email_opt_in
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Log the number of profiles created
DO $$
DECLARE
  rows_affected INTEGER;
BEGIN
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RAISE NOTICE 'Created % missing profile(s)', rows_affected;
END $$;
