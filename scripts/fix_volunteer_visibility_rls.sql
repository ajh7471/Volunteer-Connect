-- Enable read access to profiles for all authenticated users
-- This allows volunteers to see the names of other volunteers on the same shift
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING ( true );

-- Enable read access to shift_assignments for all authenticated users
-- This allows volunteers to see who else is signed up for a shift
DROP POLICY IF EXISTS "Shift assignments are viewable by everyone" ON shift_assignments;
CREATE POLICY "Shift assignments are viewable by everyone"
  ON shift_assignments FOR SELECT
  USING ( true );
