-- Remove duplicate trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role();

-- The existing handle_new_user() trigger already handles role assignment