-- FIX RLS: Allow admins to delete other users' pole interests
-- Problem: Currently, only the user themselves can delete their interest. Admins receive a permission error.

-- 1. Update DELETE policy for pole_interests
DROP POLICY IF EXISTS "Users can delete own interests" ON pole_interests;
DROP POLICY IF EXISTS "Delete pole interests" ON pole_interests;

CREATE POLICY "Enable delete for users and admins" ON pole_interests
FOR DELETE
USING (
  auth.uid() = user_id 
  OR 
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);
