-- =============================================================================
-- 💬 CHAT MODULE ENHANCEMENTS MIGRATION
-- =============================================================================
-- Ce script ajoute les colonnes nécessaires pour les nouvelles fonctionnalités 
-- du chat (Read Status, Replies, Edit/Delete).

-- 1. READ STATUS (Statut de lecture)
-- Ajout de timestamps de lecture sur la table tickets pour savoir 
-- quand chaque partie a lu la conversation pour la dernière fois.
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS admin_last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS volunteer_last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. MESSAGES ENHANCEMENTS
-- Ajout de colonnes pour :
-- - reply_to_id : Référence au message auquel on répond (Self-referencing FK)
-- - edited_at : Date de la dernière modification
-- - deleted_at : Date de suppression (Soft delete)
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id),
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. POLICIES UPDATES (Optional but recommended)
-- S'assurer que les views incluent les deleted_at pour qu'on puisse les filtrer
-- Note : L'application filtrera généralement "deleted_at IS NULL" ou affichera "Message supprimé".
-- Pas de changement de politique de sécurité nécessaire si les SELECT existants sont déjà permissifs.

-- 4. REFLECT CHANGES (Commentaires pour documentation)
COMMENT ON COLUMN public.tickets.admin_last_read_at IS 'Date de dernière lecture par un administrateur';
COMMENT ON COLUMN public.tickets.volunteer_last_read_at IS 'Date de dernière lecture par le bénévole propriétaire';
COMMENT ON COLUMN public.messages.reply_to_id IS 'ID du message parent (réponse)';
COMMENT ON COLUMN public.messages.edited_at IS 'Date de modification du contenu';
COMMENT ON COLUMN public.messages.deleted_at IS 'Date de suppression logique';
