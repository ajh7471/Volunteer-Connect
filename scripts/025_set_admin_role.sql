-- Script to update existing admin profile to admin role
-- After auth user creation, this updates the profile

UPDATE public.profiles
SET 
  role = 'admin',
  name = 'Admin User',
  active = true,
  updated_at = NOW()
WHERE email = 'admin@vanderpumpdogs';

-- Verify the update
SELECT id, email, name, role, active FROM public.profiles 
WHERE email = 'admin@vanderpumpdogs';
