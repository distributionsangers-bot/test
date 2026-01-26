-- Fix: Update get_future_shift_counts to match the new register_to_shift logic
-- The RPC must account for the fact that reserved_taken should only count
-- students (mandatory_hours=true) whose registrations have counts_for_hours=true

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
        registrations.shift_id,
        COUNT(*)::INTEGER as total_count,
        COUNT(CASE 
            WHEN registrations.counts_for_hours = TRUE 
            AND profiles.mandatory_hours = TRUE 
            THEN 1 
        END)::INTEGER as reserved_taken
    FROM public.registrations
    JOIN public.shifts ON shifts.id = registrations.shift_id
    JOIN public.events ON events.id = shifts.event_id
    JOIN public.profiles ON profiles.id = registrations.user_id
    WHERE events.date >= CURRENT_DATE
    GROUP BY registrations.shift_id;
$$;

-- Verify the function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'get_future_shift_counts' AND routine_schema = 'public';
