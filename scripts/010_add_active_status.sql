-- Adding active status field to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Update existing records to be active
UPDATE profiles SET active = true WHERE active IS NULL;

-- Add index for filtering active/inactive users
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(active);

-- Add comment
COMMENT ON COLUMN profiles.active IS 'Whether the user account is active. Inactive accounts cannot log in.';
