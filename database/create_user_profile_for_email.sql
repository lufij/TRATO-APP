-- Create a profile in public.users for an existing Auth user by email
-- How to use:
-- 1) Replace the value of v_email with the target email
-- 2) Run this whole block in Supabase SQL editor

DO $$
DECLARE
  v_email text := 'REPLACE_WITH_EMAIL@example.com';
  v_role text := 'comprador'; -- 'comprador' | 'vendedor' | 'repartidor'
  v_name text;
  v_uid uuid;
BEGIN
  -- Find user id in auth.users
  SELECT id INTO v_uid FROM auth.users WHERE email = v_email LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in auth.users. Create the user in Authentication > Users first.', v_email;
  END IF;

  -- Default name from email prefix
  v_name := split_part(v_email, '@', 1);

  -- Create profile only if missing
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_uid) THEN
    INSERT INTO public.users (id, email, name, role, created_at, updated_at)
    VALUES (v_uid, v_email, v_name, v_role, NOW(), NOW());
    RAISE NOTICE 'Created profile in public.users for % with role %', v_email, v_role;
  ELSE
    RAISE NOTICE 'Profile already exists in public.users for %', v_email;
  END IF;
END $$;
