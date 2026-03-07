-- Temporarily disable the role protection trigger
ALTER TABLE profiles DISABLE TRIGGER protect_role_changes;

-- Set admin role
UPDATE profiles 
SET role = 'admin', active = true, updated_at = NOW()
WHERE id = '0239db78-1f2e-4046-b0f8-1397d0349a1c';

-- Re-enable the trigger
ALTER TABLE profiles ENABLE TRIGGER protect_role_changes;

-- Verify
SELECT id, email, name, role, active FROM profiles WHERE id = '0239db78-1f2e-4046-b0f8-1397d0349a1c';
