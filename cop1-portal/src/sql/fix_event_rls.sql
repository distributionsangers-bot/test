-- FIX RLS: Remove overly permissive policies that override the 'Approved Only' logic
-- Problem: 'View Events' allows ALL authenticated users to see events, rendering 'Events viewable by approved' useless.

-- 1. Events
DROP POLICY IF EXISTS "View Events" ON events;
-- Ensure 'Events viewable by approved' is the main SELECT policy
-- (It already exists based on the CSV, but we can iterate to be safe)

-- 2. Shifts
DROP POLICY IF EXISTS "View Shifts" ON shifts;  
-- Ensure 'Shifts viewable by approved' is the main SELECT policy

-- 3. Templates (Optional, but usually admin only or viewable by all?)
-- 'View Templates' allows all authenticated. If templates are public, it's fine.

-- 4. Verify 'Approved' Policy exists (re-creating it just in case to be sure it's correct)
-- Note: The CSV showed it exists, so we just drop the conflicting one.
