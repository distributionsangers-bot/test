-- ============================================
-- FIX: toggle_attendance - Bénévoles-école sur places réservées
-- ============================================
-- Problème: counts_for_hours n'est jamais mis à TRUE pour les bénévoles-école
-- qui s'inscrivent sur une place réservée.
--
-- Solution: Modifier toggle_attendance pour:
-- 1. Vérifier si le bénévole est de type "école" (mandatory_hours = true)
-- 2. Vérifier si au moment de son inscription, il y avait des places réservées disponibles
-- 3. Si oui, automatiquement mettre counts_for_hours = TRUE
-- ============================================

CREATE OR REPLACE FUNCTION public.toggle_attendance(p_reg_id bigint, p_is_present boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reg RECORD;
    v_shift RECORD;
    v_profile RECORD;
    v_hours NUMERIC;
    v_should_count BOOLEAN;
    v_old_counted NUMERIC;
    v_new_counted NUMERIC;
    v_is_school_volunteer BOOLEAN;
    v_registration_order INT;
    v_reserved_slots INT;
BEGIN
    -- Get Registration
    SELECT * INTO v_reg FROM public.registrations WHERE id = p_reg_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registration not found';
    END IF;

    -- Get Shift
    SELECT * INTO v_shift FROM public.shifts WHERE id = v_reg.shift_id;
    
    -- Get Profile to check if school volunteer
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_reg.user_id;
    v_is_school_volunteer := COALESCE(v_profile.mandatory_hours, FALSE);
    
    -- Get reserved slots for this shift
    v_reserved_slots := COALESCE(v_shift.reserved_slots, 0);

    -- Determine if this volunteer should count for hours
    -- Logic: 
    -- - Non-school volunteers: Always counts (counts_for_hours = TRUE)
    -- - School volunteers: Counts IF they registered on a reserved slot
    --   We determine this by checking their registration order among school volunteers
    
    IF v_is_school_volunteer AND v_reserved_slots > 0 THEN
        -- Count how many school volunteers registered BEFORE this one on this shift
        SELECT COUNT(*) INTO v_registration_order
        FROM public.registrations r
        JOIN public.profiles p ON r.user_id = p.id
        WHERE r.shift_id = v_reg.shift_id
          AND p.mandatory_hours = TRUE
          AND r.created_at < v_reg.created_at;
        
        -- If their position is within reserved slots, they count
        -- (0 = first school volunteer, should use slot 1, etc.)
        v_should_count := (v_registration_order < v_reserved_slots);
    ELSIF v_is_school_volunteer AND v_reserved_slots = 0 THEN
        -- School volunteer on a shift with NO reserved slots = never counts
        v_should_count := FALSE;
    ELSE
        -- Non-school volunteer: always counts
        v_should_count := TRUE;
    END IF;

    -- Update the counts_for_hours field based on our calculation
    -- IMPORTANT: Never downgrade from TRUE to FALSE (respects admin "Force Validation")
    -- Only upgrade from FALSE to TRUE if our calculation says it should count
    IF v_reg.counts_for_hours = FALSE AND v_should_count = TRUE THEN
        UPDATE public.registrations 
        SET counts_for_hours = TRUE
        WHERE id = p_reg_id;
    END IF;
    
    -- For the hours calculation, use the current value from DB (might be manually forced)
    -- Re-fetch to get the potentially updated value
    SELECT counts_for_hours INTO v_should_count FROM public.registrations WHERE id = p_reg_id;

    -- Update Attended status
    UPDATE public.registrations 
    SET attended = p_is_present,
        checked_in_at = CASE WHEN p_is_present THEN NOW() ELSE NULL END
    WHERE id = p_reg_id;

    -- Handle Hours
    v_hours := COALESCE(v_shift.hours_value, 0);
    v_old_counted := COALESCE(v_reg.hours_counted, 0);
    v_new_counted := 0;

    -- Calculate what the new hours_counted SHOULD be
    IF p_is_present AND v_should_count THEN
        v_new_counted := v_hours;
    END IF;

    -- Update Profile total_hours
    IF v_new_counted <> v_old_counted THEN
        UPDATE public.profiles
        SET total_hours = COALESCE(total_hours, 0) - v_old_counted + v_new_counted
        WHERE id = v_reg.user_id;

        -- Update Registration history
        UPDATE public.registrations
        SET hours_counted = v_new_counted
        WHERE id = p_reg_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'counts_for_hours', v_should_count,
        'hours_counted', v_new_counted
    );
END;
$$;

-- ============================================
-- COMMENTAIRE:
-- Ce fix calcule dynamiquement si un bénévole-école doit avoir ses heures comptées
-- en vérifiant son ordre d'inscription parmi les bénévoles-école du créneau.
-- 
-- Exemple:
-- - Créneau avec 2 places réservées
-- - Bénévole-école A s'inscrit en 1er → Compte (position 0 < 2)
-- - Bénévole-école B s'inscrit en 2ème → Compte (position 1 < 2)  
-- - Bénévole-école C s'inscrit en 3ème → Ne compte pas (position 2 >= 2)
-- ============================================
