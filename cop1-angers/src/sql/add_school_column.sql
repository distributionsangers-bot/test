-- Add school column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS school TEXT;

-- Verify the column was added
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'school') THEN 
        RAISE EXCEPTION 'Column school was not added to profiles table';
    END IF;
END $$;
