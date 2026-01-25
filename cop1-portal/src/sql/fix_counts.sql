-- ============================================================
-- FIX: COUNTING REGISTRATIONS FOR VOLUNTEERS
-- ============================================================
-- Issue: Volunteers cannot see other people's registrations due to RLS.
-- Solution: Create a SECURITY DEFINER function to count registrations
--           without exposing user data.

CREATE OR REPLACE FUNCTION get_future_shift_counts()
RETURNS TABLE (shift_id bigint, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as shift_id, 
    COUNT(r.user_id) as count
  FROM shifts s
  LEFT JOIN registrations r ON s.id = r.shift_id
  JOIN events e ON s.event_id = e.id
  WHERE e.date >= CURRENT_DATE
  GROUP BY s.id;
END;
$$;
