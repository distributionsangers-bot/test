-- Ajout de la suppression en cascade pour les messages
-- Cela permet de supprimer un ticket et que ses messages disparaissent automatiquement
-- Plus besoin de supprimer manuellement les messages avant le ticket.

ALTER TABLE public.messages
DROP CONSTRAINT messages_ticket_id_fkey,
ADD CONSTRAINT messages_ticket_id_fkey
    FOREIGN KEY (ticket_id)
    REFERENCES public.tickets(id)
    ON DELETE CASCADE;
