-- Temporarily disable RLS on profiles to set admin role
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Set admin role
UPDATE profiles 
SET role = 'admin', active = true, updated_at = NOW()
WHERE id = '0239db78-1f2e-4046-b0f8-1397d0349a1c';

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Verify the update
SELECT id, email, name, role, active FROM profiles WHERE id = '0239db78-1f2e-4046-b0f8-1397d0349a1c';
