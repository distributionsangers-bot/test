-- ============================================================
-- FIX: CHAT DELETE RLS POLICIES FOR ADMINS
-- ============================================================
-- This script adds Row-Level Security policies to allow Administrators
-- to PERMANENTLY delete tickets and messages.

-- 1. Allow Admins to DELETE messages (Cascade delete usually handles this, but good to be explicit)
DROP POLICY IF EXISTS "Admins can delete messages" ON public.messages;
CREATE POLICY "Admins can delete messages"
ON public.messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- 2. Allow Admins to DELETE tickets
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.tickets;
CREATE POLICY "Admins can delete tickets"
ON public.tickets
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

COMMENT ON POLICY "Admins can delete messages" ON public.messages IS 'Permet aux admins de supprimer définitivement des messages.';
COMMENT ON POLICY "Admins can delete tickets" ON public.tickets IS 'Permet aux admins de supprimer définitivement des conversations.';
