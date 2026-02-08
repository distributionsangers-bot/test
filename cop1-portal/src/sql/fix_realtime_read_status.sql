-- =============================================================================
-- FIX: Real-time Read Confirmation for Messages
-- =============================================================================
-- 
-- PROBLÈME:
-- Les confirmations de lecture (✓✓) ne se mettent pas à jour en temps réel.
-- Quand un utilisateur lit un message, l'autre ne voit pas le changement
-- de statut de lecture instantanément.
--
-- CAUSE:
-- La fonctionnalité Realtime de Supabase nécessite:
-- 1. Que la table soit ajoutée à la publication Realtime
-- 2. Que le Replica Identity soit configuré sur FULL pour recevoir
--    toutes les données dans le payload des événements UPDATE
--
-- SOLUTION:
-- Exécutez ce script dans l'éditeur SQL de Supabase (Dashboard > SQL Editor)
-- =============================================================================

-- 1. Activer Replica Identity FULL sur la table tickets
-- Cela permet de recevoir les anciennes ET nouvelles valeurs lors des UPDATE
ALTER TABLE public.tickets REPLICA IDENTITY FULL;

-- 2. Activer Replica Identity FULL sur la table messages (pour les autres événements)
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 3. Ajouter les tables à la publication Realtime Supabase
-- Note: Si la publication n'existe pas encore, Supabase la crée automatiquement
-- via le Dashboard. Ces commandes ajoutent les tables à la publication existante.

-- Vérifier d'abord si les tables sont déjà dans la publication:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Ajouter tickets à la publication Realtime (ignorer si déjà présent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'tickets'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
    END IF;
END $$;

-- Ajouter messages à la publication Realtime (ignorer si déjà présent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
-- Après exécution, vérifiez avec:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
--
-- Vous devriez voir 'tickets' et 'messages' dans la liste.
-- =============================================================================
