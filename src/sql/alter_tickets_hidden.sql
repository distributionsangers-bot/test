-- Ajout de colonnes pour la suppression sélective (Soft Delete)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS hidden_for_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS hidden_for_volunteer BOOLEAN DEFAULT FALSE;

-- S'assurer que les permissions RLS permettent l'update de ces colonnes
-- (Normalement la policy UPDATE existante couvre "tout" ou "status", il faut vérifier si elle est permissive)
-- Si vous avez des policies strictes sur les colonnes, ajoutez une policy :

/*
CREATE POLICY "Admins can update hidden_for_admin" ON tickets FOR UPDATE
USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true))
WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

CREATE POLICY "Volunteers can update hidden_for_volunteer" ON tickets FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
*/
