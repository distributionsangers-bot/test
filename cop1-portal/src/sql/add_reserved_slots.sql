-- 1. Add reserved_slots to shifts table
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS reserved_slots INTEGER DEFAULT 0;

-- 2. Add counts_for_hours to registrations (to freeze the status at registration time)
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS counts_for_hours BOOLEAN DEFAULT FALSE;

-- 3. Update the register_to_shift function to handle the logic
CREATE OR REPLACE FUNCTION public.register_to_shift(p_user_id UUID, p_shift_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_shift RECORD;
    v_user_profile RECORD;
    v_total_registrations INTEGER;
    v_reserved_taken INTEGER;
    v_counts_for_hours BOOLEAN;
    v_new_reg_id BIGINT;
BEGIN
    -- 1. Get Shift Info
    SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shift not found';
    END IF;

    -- 2. Get User Info
    SELECT * INTO v_user_profile FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    -- 3. Check if already registered
    IF EXISTS (SELECT 1 FROM public.registrations WHERE shift_id = p_shift_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'Already registered';
    END IF;

    -- 4. Get Current Counts
    -- Total regs
    SELECT COUNT(*) INTO v_total_registrations FROM public.registrations WHERE shift_id = p_shift_id;
    
    -- Reserved spots taken (by students whose hours count)
    SELECT COUNT(*) INTO v_reserved_taken 
    FROM public.registrations 
    WHERE shift_id = p_shift_id AND counts_for_hours = TRUE;

    -- 5. Capacity Check (Global)
    IF v_total_registrations >= v_shift.max_slots THEN
        RAISE EXCEPTION 'Shift is full';
    END IF;

    -- 6. Determine if hours count
    v_counts_for_hours := FALSE;

    -- Only students with mandatory hours can take reserved spots
    IF v_user_profile.mandatory_hours = TRUE THEN
        -- If there is space in reserved slots
        IF v_reserved_taken < v_shift.reserved_slots THEN
            v_counts_for_hours := TRUE;
        END IF;
    END IF;

    -- 7. Insert Registration
    INSERT INTO public.registrations (shift_id, user_id, attended, counts_for_hours, created_at)
    VALUES (p_shift_id, p_user_id, FALSE, v_counts_for_hours, NOW())
    RETURNING id INTO v_new_reg_id;

    RETURN jsonb_build_object(
        'success', true,
        'registration_id', v_new_reg_id,
        'counts_for_hours', v_counts_for_hours
    );
END;
$$;

-- 4. Update get_future_shift_counts to include reserved info
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
