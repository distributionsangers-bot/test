-- Fix get_future_shift_counts signature mismatch
-- Must DROP first because we are changing the output columns (RETURNS TABLE)

DROP FUNCTION IF EXISTS public.get_future_shift_counts();

CREATE OR REPLACE FUNCTION public.get_future_shift_counts()
RETURNS TABLE (
    shift_id BIGINT, 
    total_count INTEGER,
    reserved_taken INTEGER
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        shift_id, 
        COUNT(*)::INTEGER as total_count,
        COUNT(CASE WHEN counts_for_hours = TRUE THEN 1 END)::INTEGER as reserved_taken
    FROM public.registrations
    JOIN public.shifts ON shifts.id = registrations.shift_id
    JOIN public.events ON events.id = shifts.event_id
    WHERE events.date >= CURRENT_DATE
    GROUP BY shift_id;
$$;
