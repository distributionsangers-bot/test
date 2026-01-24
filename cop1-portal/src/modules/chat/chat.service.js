import { store } from '../../core/store.js';
import { supabase } from '../../services/supabase.js';

export const ChatService = {

    // --- FETCHING ---

    /**
     * Récupère la liste des conversations (Tickets & Annonces)
     */
    async getTickets() {
        const user = store.state.user;
        if (!user) return { success: false, error: "Non connecté" };

        const isAdmin = store.state.profile?.is_admin && store.state.adminMode;
        let query = supabase
            .from('tickets')
            .select(`
                *,
                last_message:messages(content, created_at, user_id)
            `)
            .order('last_message_at', { ascending: false });

        if (!isAdmin) {
            query = query.or(`user_id.eq.${user.id},category.eq.announcement`);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching tickets:", error);
            return { success: false, error };
        }

        // FIX: Aplatir last_message (array -> string) pour la vue
        const formatted = data.map(t => {
            const msgs = t.last_message;
            let content = null;
            // On prend le dernier message (supposons que Supabase renvoie dans l'ordre ou on prend le 1er)
            // Idéalement il faudrait trier msgs par created_at desc si ce n'est pas le cas
            if (Array.isArray(msgs) && msgs.length > 0) {
                // Tri simple au cas où
                msgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                content = msgs[0].content;
            }
            return { ...t, last_message: content };
        });

        return { success: true, data: formatted };
    },

    /**
     * Récupère l'historique d'une conversation
     */
    async getMessages(ticketId) {
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                profiles(first_name, last_name, is_admin)
            `)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true }); // Chronologique

        if (error) return { success: false, error };
        return { success: true, data };
    },

    // --- ACTIONS ---

    /**
     * Envoie un message dans une conversation
     */
    async sendMessage(ticketId, content) {
        const user = store.state.user;
        if (!content || !content.trim()) return { success: false };

        const { data, error } = await supabase
            .from('messages')
            .insert([{
                ticket_id: ticketId,
                user_id: user.id,
                content: content.trim()
            }])
            .select() // Important pour avoir l'ID et la date tout de suite (Optimistic UI confirmé par serveur)
            .single();

        if (error) return { success: false, error };

        // Mettre à jour le 'last_message_at' du ticket pour le faire remonter
        await supabase.from('tickets').update({ last_message_at: new Date().toISOString() }).eq('id', ticketId);

        return { success: true, data };
    },

    /**
     * Crée un nouveau ticket Support
     */
    async createTicket(subject, content) {
        const user = store.state.user;

        // 1. Créer le ticket
        const { data: ticket, error: tErr } = await supabase
            .from('tickets')
            .insert([{
                user_id: user.id,
                subject: subject,
                category: 'support'
            }])
            .select()
            .single();

        if (tErr) return { success: false, error: tErr };

        // 2. Insérer le premier message
        if (content) {
            await this.sendMessage(ticket.id, content);
        }

        return { success: true, data: ticket };
    },

    /**
     * Crée une annonce (Admin seulement)
     */
    async createAnnouncement(subject, content) {
        const user = store.state.user;
        // Sécurité côté client (en plus du RLS)
        if (!store.state.profile?.is_admin) return { success: false, error: "Non autorisé" };

        // 1. Créer le ticket type 'announcement'
        const { data: ticket, error: tErr } = await supabase
            .from('tickets')
            .insert([{
                user_id: user.id, // L'auteur de l'annonce
                subject: subject,
                category: 'announcement'
            }])
            .select()
            .single();

        if (tErr) return { success: false, error: tErr };

        // 2. Insérer le message
        if (content) {
            await this.sendMessage(ticket.id, content);
        }

        return { success: true, data: ticket };
    },

    /**
     * Crée un message direct à un bénévole (Admin seulement)
     * @param {string} targetUserId - ID du bénévole destinataire
     * @param {string} subject - Sujet du ticket
     * @param {string} content - Premier message
     */
    async createDirectMessage(targetUserId, subject, content) {
        const user = store.state.user;
        if (!store.state.profile?.is_admin) return { success: false, error: "Non autorisé" };

        // Créer le ticket privé avec le bénévole comme owner
        // L'admin envoie le premier message
        const { data: ticket, error: tErr } = await supabase
            .from('tickets')
            .insert([{
                user_id: targetUserId, // Le bénévole est le "owner" du ticket
                subject: subject,
                category: 'support' // Direct message = support privé
            }])
            .select()
            .single();

        if (tErr) return { success: false, error: tErr };

        // Envoyer le premier message (de l'admin)
        if (content) {
            await this.sendMessage(ticket.id, content);
        }

        return { success: true, data: ticket };
    },

    /**
     * Abonnement aux messages d'un ticket spécifique
     * @param {string} ticketId 
     * @param {function} onMessageCallback (payload) => void
     * @returns {object} { unsubscribe: () => void }
     */
    subscribeToTicket(ticketId, onMessageCallback) {
        const channel = supabase.channel(`ticket-${ticketId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `ticket_id=eq.${ticketId}`
                },
                (payload) => {
                    // On reçoit le nouveau message brut
                    // Idéalement on aurait besoin du profil associé, mais le payload INSERT ne l'a pas.
                    // Soit on le fetch, soit on l'affiche sans nom temporairement.
                    // Pour l'instant on passe le payload brut.
                    onMessageCallback(payload.new);
                }
            )
            .subscribe();

        return {
            unsubscribe: () => {
                supabase.removeChannel(channel);
            }
        };
    },

    // --- TICKET MANAGEMENT (Admin) ---

    /**
     * Ferme/résout un ticket
     * @param {string} ticketId
     * @returns {Promise<{success, error}>}
     */
    async closeTicket(ticketId) {
        if (!store.state.profile?.is_admin) {
            return { success: false, error: "Non autorisé" };
        }

        const { error } = await supabase
            .from('tickets')
            .update({ status: 'closed' })
            .eq('id', ticketId);

        if (error) {
            console.error("Error closing ticket:", error);
            return { success: false, error };
        }

        return { success: true };
    },

    /**
     * Supprime un ticket et ses messages
     * @param {string} ticketId
     * @returns {Promise<{success, error}>}
     */
    async deleteTicket(ticketId) {
        if (!store.state.profile?.is_admin) {
            return { success: false, error: "Non autorisé" };
        }

        // 1. Supprimer les messages d'abord (FK constraint)
        const { error: msgErr } = await supabase
            .from('messages')
            .delete()
            .eq('ticket_id', ticketId);

        if (msgErr) {
            console.error("Error deleting messages:", msgErr);
            return { success: false, error: msgErr };
        }

        // 2. Supprimer le ticket
        const { error: ticketErr } = await supabase
            .from('tickets')
            .delete()
            .eq('id', ticketId);

        if (ticketErr) {
            console.error("Error deleting ticket:", ticketErr);
            return { success: false, error: ticketErr };
        }

        return { success: true };
    }
};
