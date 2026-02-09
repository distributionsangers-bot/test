-- ============================================
-- FIX: Mise à jour du compteur reserved_taken
-- ============================================
-- Problème: Quand un bénévole-école s'inscrit, le compteur reserved_taken
-- n'est pas incrémenté, donc l'affichage visuel ne se met pas à jour.
--
-- Solution: 
-- 1. Modifier register_to_shift pour incrémenter reserved_taken si bénévole école
-- 2. Créer un trigger sur DELETE pour décrémenter reserved_taken
-- ============================================

-- ============================================
-- 1. MISE À JOUR DE register_to_shift
-- ============================================
DROP FUNCTION IF EXISTS public.register_to_shift(bigint);
DROP FUNCTION IF EXISTS public.register_to_shift(bigint, text);
DROP FUNCTION IF EXISTS public.register_to_shift(uuid);
DROP FUNCTION IF EXISTS public.register_to_shift(uuid, text);

CREATE OR REPLACE FUNCTION public.register_to_shift(p_shift_id BIGINT, p_note TEXT DEFAULT NULL)
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
    v_is_school_volunteer BOOLEAN;
    v_reserved_slots INT;
    v_current_reserved_taken INT;
BEGIN
    v_user_id := auth.uid();

    -- Check if shift exists and get details
    SELECT max_slots, start_time, end_time, events.date, reserved_slots, COALESCE(reserved_taken, 0)
    INTO v_max_slots, v_start_time, v_end_time, v_event_date, v_reserved_slots, v_current_reserved_taken
    FROM shifts
    JOIN events ON shifts.event_id = events.id
    WHERE shifts.id = p_shift_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shift not found';
    END IF;

    -- Check if user is a school volunteer
    SELECT COALESCE(mandatory_hours, FALSE)
    INTO v_is_school_volunteer
    FROM profiles
    WHERE id = v_user_id;

    -- Check for conflicts (same date, overlapping time)
    SELECT count(*)
    INTO v_conflict_count
    FROM registrations r
    JOIN shifts s ON r.shift_id = s.id
    JOIN events e ON s.event_id = e.id
    WHERE r.user_id = v_user_id
        AND e.date = v_event_date
        AND r.shift_id != p_shift_id
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

    -- Update total_registrations counter
    UPDATE shifts 
    SET total_registrations = v_current_count + 1
    WHERE id = p_shift_id;

    -- If school volunteer and reserved slots available, increment reserved_taken
    IF v_is_school_volunteer AND v_reserved_slots > 0 AND v_current_reserved_taken < v_reserved_slots THEN
        UPDATE shifts 
        SET reserved_taken = v_current_reserved_taken + 1
        WHERE id = p_shift_id;
    END IF;

END;
$$;

-- ============================================
-- 2. TRIGGER POUR GÉRER LES DÉSINSCRIPTIONS
-- ============================================
-- Fonction trigger pour mettre à jour les compteurs lors d'une suppression
CREATE OR REPLACE FUNCTION public.handle_registration_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_school_volunteer BOOLEAN;
    v_shift RECORD;
    v_school_volunteers_count INT;
    v_new_reserved_taken INT;
BEGIN
    -- Get shift details
    SELECT * INTO v_shift FROM shifts WHERE id = OLD.shift_id;
    
    -- Check if the deleted user was a school volunteer
    SELECT COALESCE(mandatory_hours, FALSE)
    INTO v_is_school_volunteer
    FROM profiles
    WHERE id = OLD.user_id;

    -- Decrement total_registrations
    UPDATE shifts 
    SET total_registrations = GREATEST(0, COALESCE(total_registrations, 0) - 1)
    WHERE id = OLD.shift_id;

    -- If school volunteer and there were reserved slots, recalculate reserved_taken
    IF v_is_school_volunteer AND v_shift.reserved_slots > 0 THEN
        -- Count remaining school volunteers on this shift
        SELECT COUNT(*) INTO v_school_volunteers_count
        FROM registrations r
        JOIN profiles p ON r.user_id = p.id
        WHERE r.shift_id = OLD.shift_id
          AND p.mandatory_hours = TRUE;
        
        -- reserved_taken = MIN(school_volunteers_count, reserved_slots)
        v_new_reserved_taken := LEAST(v_school_volunteers_count, v_shift.reserved_slots);
        
        UPDATE shifts 
        SET reserved_taken = v_new_reserved_taken
        WHERE id = OLD.shift_id;
    END IF;

    RETURN OLD;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_registration_delete ON registrations;
CREATE TRIGGER on_registration_delete
    AFTER DELETE ON registrations
    FOR EACH ROW
    EXECUTE FUNCTION handle_registration_delete();

-- ============================================
-- 3. RECALCULER reserved_taken POUR LES DONNÉES EXISTANTES
-- ============================================
-- Cette requête recalcule le compteur pour tous les créneaux existants
UPDATE shifts s
SET reserved_taken = (
    SELECT LEAST(
        COALESCE(s.reserved_slots, 0),
        (
            SELECT COUNT(*)
            FROM registrations r
            JOIN profiles p ON r.user_id = p.id
            WHERE r.shift_id = s.id
              AND p.mandatory_hours = TRUE
        )
    )
)
WHERE s.reserved_slots > 0;

-- ============================================
-- COMMENTAIRES:
-- Cette migration corrige le compteur reserved_taken pour:
-- 1. Les nouvelles inscriptions (via register_to_shift)
-- 2. Les désinscriptions (via trigger on_registration_delete)
-- 3. Les données existantes (via UPDATE de recalcul)
-- ============================================
