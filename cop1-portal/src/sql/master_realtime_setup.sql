-- MASTER SCRIPT: REALTIME COUNTERS SETUP
-- Run this script to fully enable the realtime slot counting feature.

BEGIN;

-- 1. Add columns to 'shifts' table if they don't exist
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS total_registrations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reserved_taken INTEGER DEFAULT 0;

-- 2. Create/Replace the trigger function
CREATE OR REPLACE FUNCTION public.update_shift_counts()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_shift_id BIGINT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_shift_id := OLD.shift_id;
    ELSE
        v_shift_id := NEW.shift_id;
    END IF;

    -- Recalculate counts
    UPDATE public.shifts
    SET 
        total_registrations = (
            SELECT COUNT(*) FROM public.registrations WHERE shift_id = v_shift_id
        ),
        reserved_taken = (
            SELECT COUNT(*) FROM public.registrations WHERE shift_id = v_shift_id AND counts_for_hours = TRUE
        )
    WHERE id = v_shift_id;

    RETURN NULL;
END;
$$;

-- 3. Attach triggering to the 'registrations' table
DROP TRIGGER IF EXISTS trg_update_shift_counts ON public.registrations;
CREATE TRIGGER trg_update_shift_counts
AFTER INSERT OR UPDATE OR DELETE ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_shift_counts();

-- 4. Initial calculation (Backfill existing data)
UPDATE public.shifts s
SET 
    total_registrations = (SELECT COUNT(*) FROM public.registrations r WHERE r.shift_id = s.id),
    reserved_taken = (SELECT COUNT(*) FROM public.registrations r WHERE r.shift_id = s.id AND r.counts_for_hours = TRUE);

-- 5. Enable Realtime for 'shifts' (Supabase specific)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'shifts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
    END IF;
END;
$$;

COMMIT;
