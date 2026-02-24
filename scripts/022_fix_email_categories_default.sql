-- Fix: Allow NULL in email_categories column OR set a default
-- The profile trigger can insert NULL for email_categories when
-- the user hasn't set preferences, causing a NOT NULL violation.

-- Option: Make the column nullable and set a default
ALTER TABLE public.profiles 
  ALTER COLUMN email_categories SET DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles 
  ALTER COLUMN email_categories DROP NOT NULL;

-- Also update the trigger to use empty object when null
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, email, email_opt_in, email_categories, role, active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'name', ''),
    COALESCE(new.raw_user_meta_data ->> 'phone', ''),
    new.email,
    COALESCE((new.raw_user_meta_data ->> 'email_opt_in')::boolean, false),
    COALESCE(new.raw_user_meta_data -> 'email_categories', '{}'::jsonb),
    'volunteer',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    email = COALESCE(EXCLUDED.email, profiles.email);

  RETURN new;
END;
$$;
