# Foreign Key Constraint Error - Fix Documentation

## Issue Description

**Error:** `insert or update on table "shift_assignments" violates foreign key constraint "shift_assignments_user_id_fkey"`

**User Affected:** ahair@icloud.com

**Root Cause:** The user account exists in Supabase Auth but does not have a corresponding record in the `profiles` table. When attempting to create a shift assignment, the foreign key constraint fails because `shift_assignments.user_id` must reference an existing `profiles.id`.

## Why This Happened

This issue can occur when:
1. A user account is created in Supabase Auth but the profile creation step fails or is skipped
2. Database triggers that normally create profiles automatically are disabled or not functioning
3. Manual user creation in Auth console without creating corresponding profile
4. Race conditions during signup process

## Solution Implemented

### 1. Database Script (scripts/019_fix_missing_profiles.sql)

Created a migration script that:
- Identifies all auth users without corresponding profiles
- Automatically creates missing profile records
- Sets default values (role: 'volunteer', email_opt_in: true, active: true)
- Derives name from email if not available in metadata

**To Run:**
Execute the script from the v0 interface or Supabase SQL editor.

### 2. Application Code Update (lib/shifts.ts)

Enhanced the `signUpForShift` function to:
- Check if user profile exists before attempting assignment
- Provide clear error message if profile is missing
- Add comprehensive logging for debugging
- Guide users to contact admin if profile is missing

### 3. Verification Steps

After running the fix:

1. **Check profiles table:**
   \`\`\`sql
   SELECT id, email, name, role 
   FROM profiles 
   WHERE email = 'ahair@icloud.com';
   \`\`\`

2. **Verify no orphaned auth users:**
   \`\`\`sql
   SELECT au.id, au.email
   FROM auth.users au
   LEFT JOIN profiles p ON au.id = p.id
   WHERE p.id IS NULL;
   \`\`\`

3. **Test shift assignment:**
   - Log in as ahair@icloud.com
   - Attempt to add a shift
   - Should succeed without foreign key error

## Prevention

### Ensure Signup Process Creates Profiles

Check that `app/auth/signup/page.tsx` properly creates profile records:

\`\`\`typescript
// After successful auth signup:
await supabase.from("profiles").insert({
  id: data.user.id,
  email: data.user.email,
  name: formData.name,
  role: "volunteer"
})
\`\`\`

### Database Trigger (Alternative)

Consider adding a trigger to auto-create profiles:

\`\`\`sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'volunteer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
\`\`\`

## Impact

- **User Experience:** Users will receive a clear error message instead of a cryptic database error
- **Admin Visibility:** Logs will show when profiles are missing, making issues easier to diagnose
- **Data Integrity:** Prevents shift assignments for non-existent profiles
- **Resolution:** One-time script fixes all existing orphaned auth users

## Files Modified

1. `lib/shifts.ts` - Added profile existence check
2. `scripts/019_fix_missing_profiles.sql` - Creates missing profiles
3. `FOREIGN_KEY_ERROR_FIX_DOCUMENTATION.md` - This documentation

## Date

November 9, 2025
