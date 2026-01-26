-- 1. Ensure columns exist (Idempotent)
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS reserved_slots INTEGER DEFAULT 0;

ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS counts_for_hours BOOLEAN DEFAULT FALSE;

-- 2. Refine register_to_shift logic
-- DROP first to allow changing return type or signature
DROP FUNCTION IF EXISTS public.register_to_shift(uuid, bigint);

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
    SELECT COUNT(*) INTO v_total_registrations FROM public.registrations WHERE shift_id = p_shift_id;
    
    -- Reserved spots taken (by students whose hours count)
    SELECT COUNT(*) INTO v_reserved_taken 
    FROM public.registrations 
    WHERE shift_id = p_shift_id 
    AND counts_for_hours = TRUE 
    AND user_id IN (SELECT id FROM public.profiles WHERE mandatory_hours = TRUE);

    -- 5. Capacity Check (Global)
    IF v_total_registrations >= v_shift.max_slots THEN
        RAISE EXCEPTION 'Shift is full';
    END IF;

    -- 6. Determine if hours count
    -- Default to TRUE (Regular volunteers, etc.)
    v_counts_for_hours := TRUE;

    -- If User is Student (Mandatory Hours)
    IF v_user_profile.mandatory_hours = TRUE THEN
        -- Check if they fit in reserved slots
        -- If reserved_slots > reserved_taken, they can take a reserved spot => TRUE
        -- If reserved_slots <= reserved_taken, they are in overflow => FALSE
        IF v_reserved_taken >= v_shift.reserved_slots THEN
            v_counts_for_hours := FALSE;
        END IF;
    END IF;

    -- 7. Insert Registration
    -- We use counts_for_hours to flag if it counts. 
    -- hours_counted is initialized to 0.
    INSERT INTO public.registrations (shift_id, user_id, attended, counts_for_hours, hours_counted, created_at)
    VALUES (p_shift_id, p_user_id, FALSE, v_counts_for_hours, 0, NOW())
    RETURNING id INTO v_new_reg_id;

    RETURN jsonb_build_object(
        'success', true,
        'registration_id', v_new_reg_id,
        'counts_for_hours', v_counts_for_hours
    );
END;
$$;

-- 3. Update toggle_attendance logic to respect counts_for_hours and use hours_counted
-- DROP first to ensure clean update
DROP FUNCTION IF EXISTS public.toggle_attendance(bigint, boolean);

CREATE OR REPLACE FUNCTION public.toggle_attendance(p_reg_id BIGINT, p_is_present BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reg RECORD;
    v_shift RECORD;
    v_hours NUMERIC;
BEGIN
    -- Get Registration
    SELECT * INTO v_reg FROM public.registrations WHERE id = p_reg_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registration not found';
    END IF;

    -- Get Shift
    SELECT * INTO v_shift FROM public.shifts WHERE id = v_reg.shift_id;
    
    -- Prevent double processing check
    -- Note: We allow toggling to accommodate corrections, but we check logic below.

    -- Update Attended status
    UPDATE public.registrations 
    SET attended = p_is_present,
        checked_in_at = CASE WHEN p_is_present THEN NOW() ELSE NULL END
    WHERE id = p_reg_id;

    -- Handle Hours
    v_hours := COALESCE(v_shift.hours_value, 0);

    -- Logic: Profile Total Hours = Current - Old_Counted + New_Counted
    -- This handles toggling ON and toggling OFF correctly.
    
    DECLARE
        v_old_counted NUMERIC;
        v_new_counted NUMERIC;
    BEGIN
        v_old_counted := COALESCE(v_reg.hours_counted, 0);
        v_new_counted := 0;

        -- Calculate what the new hours_counted SHOULD be
        IF p_is_present AND v_reg.counts_for_hours = TRUE THEN
            v_new_counted := v_hours;
        END IF;

        -- Update Profile
        -- If nothing changed (e.g. absent -> absent), delta is 0
        IF v_new_counted <> v_old_counted THEN
            UPDATE public.profiles
            SET total_hours = COALESCE(total_hours, 0) - v_old_counted + v_new_counted
            WHERE id = v_reg.user_id;

            -- Update Registration history
            UPDATE public.registrations
            SET hours_counted = v_new_counted
            WHERE id = p_reg_id;
        END IF;
    END;

    RETURN jsonb_build_object('success', true);
END;
$$;
