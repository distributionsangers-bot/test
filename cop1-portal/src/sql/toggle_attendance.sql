-- ============================================================
-- FUNCTION: TOGGLE ATTENDANCE & AUTO-CALCULATE HOURS
-- ============================================================
-- When a volunteer is marked present, we automatically set their
-- hours_counted based on the shift's hours_value.

CREATE OR REPLACE FUNCTION toggle_attendance(p_reg_id bigint, p_is_present boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours numeric;
  v_shift_id bigint;
  v_result json;
BEGIN
  -- Get shift info
  SELECT s.id, COALESCE(s.hours_value, 0) INTO v_shift_id, v_hours
  FROM registrations r
  JOIN shifts s ON r.shift_id = s.id
  WHERE r.id = p_reg_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  -- Update registration
  UPDATE registrations
  SET 
    attended = p_is_present,
    checked_in_at = CASE WHEN p_is_present THEN NOW() ELSE NULL END,
    hours_counted = CASE WHEN p_is_present THEN v_hours ELSE 0 END
  WHERE id = p_reg_id;
  
  -- Return updated record as JSON
  SELECT row_to_json(r) INTO v_result FROM registrations r WHERE id = p_reg_id;
  
  RETURN v_result;
END;
$$;
