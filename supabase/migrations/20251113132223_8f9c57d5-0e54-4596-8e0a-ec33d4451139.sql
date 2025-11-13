-- Force complete types regeneration
-- Verify tables structure
DO $$ 
BEGIN
  -- Ensure hierarchy_requests table exists with all columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hierarchy_requests') THEN
    RAISE EXCEPTION 'hierarchy_requests table does not exist';
  END IF;
  
  -- Ensure profiles table has cargo and contato columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cargo') THEN
    RAISE EXCEPTION 'profiles.cargo column does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'contato') THEN
    RAISE EXCEPTION 'profiles.contato column does not exist';
  END IF;
END $$;