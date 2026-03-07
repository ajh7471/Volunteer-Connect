-- Script 024: Create admin user for Volunteer Connect
-- This script creates an admin user with email and password
-- Note: Supabase auth users cannot be directly created via SQL
-- This creates the profile for an existing auth user

-- First, we need to use the auth.users table to create the user
-- Since we can't directly insert into auth.users via SQL, this script
-- documents the manual steps needed:

-- Manual Steps in Supabase Console:
-- 1. Go to Authentication > Users
-- 2. Click "Add User"
-- 3. Enter email: admin@vanderpumpdogs
-- 4. Enter password: Admin123
-- 5. Click "Create user"
-- 6. Then run the SQL below to create the profile

-- After creating the auth user, run this SQL to set up the profile:
INSERT INTO public.profiles (
  id,
  email,
  name,
  role,
  active,
  created_at,
  updated_at
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@vanderpumpdogs' LIMIT 1),
  'admin@vanderpumpdogs',
  'Admin User',
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  name = 'Admin User',
  active = true,
  updated_at = NOW();
