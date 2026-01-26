-- ============================================================
-- FIX: REGISTRATIONS RLS POLICIES FOR ADMINS
-- ============================================================
-- This script adds Row-Level Security policies to allow Administrators
-- to manage (add/remove) participants for events.
-- Error code fix: 42501 (insufficient privilege)

-- 1. Allow Admins to INSERT registrations (Add Participant)
DROP POLICY IF EXISTS "Admins can insert registrations" ON public.registrations;
CREATE POLICY "Admins can insert registrations"
ON public.registrations
FOR INSERT
TO authenticated
WITH CHECK (
  -- Check if the current user (the one performing the action) is an admin
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- 2. Allow Admins to DELETE registrations (Remove Participant)
DROP POLICY IF EXISTS "Admins can delete registrations" ON public.registrations;
CREATE POLICY "Admins can delete registrations"
ON public.registrations
FOR DELETE
TO authenticated
USING (
  -- Check if the current user is an admin
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- 3. Validation Comments
COMMENT ON POLICY "Admins can insert registrations" ON public.registrations IS 'Permet aux administrateurs d''inscrire manuellement des participants.';
COMMENT ON POLICY "Admins can delete registrations" ON public.registrations IS 'Permet aux administrateurs de désinscrire des participants.';
