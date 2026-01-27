-- 1. Add 'note' column to registrations table
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS note TEXT;

-- 2. Update the RPC function to accept an optional note
CREATE OR REPLACE FUNCTION public.register_to_shift(p_shift_id UUID, p_note TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_max_slots INT;
    v_current_count INT;
    v_start_time TIME;
    v_end_time TIME;
    v_event_date DATE;
    v_conflict_count INT;
BEGIN
    v_user_id := auth.uid();

    -- Check if shift exists and get details
    SELECT max_slots, start_time, end_time, events.date
    INTO v_max_slots, v_start_time, v_end_time, v_event_date
    FROM shifts
    JOIN events ON shifts.event_id = events.id
    WHERE shifts.id = p_shift_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shift not found';
    END IF;

    -- Check for conflicts (same date, overlapping time)
    SELECT count(*)
    INTO v_conflict_count
    FROM registrations r
    JOIN shifts s ON r.shift_id = s.id
    JOIN events e ON s.event_id = e.id
    WHERE r.user_id = v_user_id
      AND e.date = v_event_date
      AND (
          (s.start_time, s.end_time) OVERLAPS (v_start_time, v_end_time)
      );

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Time conflict with another registration today';
    END IF;

    -- Check capacity (Locking for concurrency)
    LOCK TABLE registrations IN EXCLUSIVE MODE;

    SELECT count(*)
    INTO v_current_count
    FROM registrations
    WHERE shift_id = p_shift_id;

    IF v_current_count >= v_max_slots THEN
        RAISE EXCEPTION 'Shift is full';
    END IF;

    -- Insert registration with note
    INSERT INTO registrations (user_id, shift_id, note)
    VALUES (v_user_id, p_shift_id, p_note);

END;
$$;
