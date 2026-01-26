-- 1. Add counter columns to shifts
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS total_registrations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reserved_taken INTEGER DEFAULT 0;

-- 2. Create Trigger Function to maintain counts
CREATE OR REPLACE FUNCTION public.update_shift_counts()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_shift_id BIGINT;
BEGIN
    -- Determine shift_id based on operation
    IF (TG_OP = 'DELETE') THEN
        v_shift_id := OLD.shift_id;
    ELSE
        v_shift_id := NEW.shift_id;
    END IF;

    -- Update the counts for this specific shift
    UPDATE public.shifts
    SET 
        total_registrations = (
            SELECT COUNT(*) 
            FROM public.registrations 
            WHERE shift_id = v_shift_id
        ),
        reserved_taken = (
            SELECT COUNT(*) 
            FROM public.registrations 
            WHERE shift_id = v_shift_id
            AND counts_for_hours = TRUE
        )
    WHERE id = v_shift_id;

    RETURN NULL; -- Return value ignored for AFTER triggers
END;
$$;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS trg_update_shift_counts ON public.registrations;

CREATE TRIGGER trg_update_shift_counts
AFTER INSERT OR UPDATE OR DELETE ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_shift_counts();

-- 4. Initialize counts for existing shifts
-- This ensures the columns are correct immediately after running the script
UPDATE public.shifts s
SET 
    total_registrations = (
        SELECT COUNT(*) 
        FROM public.registrations r 
        WHERE r.shift_id = s.id
    ),
    reserved_taken = (
        SELECT COUNT(*) 
        FROM public.registrations r 
        WHERE r.shift_id = s.id
        AND r.counts_for_hours = TRUE
    );
