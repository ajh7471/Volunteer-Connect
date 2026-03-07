-- Set admin role for admin@vanderpumpdogs.org using the known user ID
UPDATE profiles 
SET role = 'admin', active = true, updated_at = NOW()
WHERE id = '0239db78-1f2e-4046-b0f8-1397d0349a1c';

-- Verify
SELECT id, email, name, role, active FROM profiles WHERE id = '0239db78-1f2e-4046-b0f8-1397d0349a1c';
