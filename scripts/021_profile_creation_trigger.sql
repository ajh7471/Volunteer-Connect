-- ============================================================================
-- Profile Auto-Creation Trigger
-- Creates a profile in public.profiles when a new user signs up via auth
-- ============================================================================

-- Function to handle new user signup - reads metadata from auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    phone,
    email,
    role,
    active,
    email_opt_in,
    email_categories,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', NULL),
    COALESCE(NEW.email, NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'volunteer'),
    true,
    COALESCE((NEW.raw_user_meta_data ->> 'email_opt_in')::boolean, false),
    CASE
      WHEN (NEW.raw_user_meta_data ->> 'email_opt_in')::boolean = true
      THEN COALESCE(NEW.raw_user_meta_data -> 'email_categories', NULL)
      ELSE NULL
    END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    email = COALESCE(EXCLUDED.email, profiles.email),
    email_opt_in = COALESCE(EXCLUDED.email_opt_in, profiles.email_opt_in),
    email_categories = COALESCE(EXCLUDED.email_categories, profiles.email_categories),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires after new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
