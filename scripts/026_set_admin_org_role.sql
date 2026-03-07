-- Set admin role for the newly created user
UPDATE profiles
SET role = 'admin', active = true, updated_at = NOW()
WHERE email = 'admin@vanderpumpdogs.org';

-- Verify the update
SELECT id, email, role, active FROM profiles WHERE email = 'admin@vanderpumpdogs.org';
