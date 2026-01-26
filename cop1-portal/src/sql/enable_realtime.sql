-- Enable Realtime for the 'shifts' table
-- This allows the frontend to listen to 'UPDATE' events on this table

BEGIN;

-- Check if publication exists, if not create (usually exists in Supabase)
-- Then add table to publication
-- We use DO block to avoid errors if already added

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'shifts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
    END IF;
END;
$$;

-- Also verify registrations trigger is active
-- (No action needed, just confirming in comments that the previous script should have handled it)

COMMIT;
