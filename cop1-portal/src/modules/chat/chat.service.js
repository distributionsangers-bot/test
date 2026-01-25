import { store } from '../../core/store.js';
import { supabase } from '../../services/supabase.js';

export const ChatService = {

    // --- FETCHING ---

    /**
     * Récupère la liste des conversations (Tickets & Annonces)
     * Filtre selon le rôle (Admin vs Bénévole) et les tickets masqués.
     */
    async getTickets() {
        const user = store.state.user;
        if (!user) return { success: false, error: "Non connecté" };

        const isAdmin = store.state.profile?.is_admin && store.state.adminMode;

        // Base query
        let query = supabase
            .from('tickets')
            .select(`
                *,
                last_message:messages(content, created_at, user_id),
                profiles:user_id(first_name, last_name, email)
            `)
            .order('last_message_at', { ascending: false })
            .neq('status', 'deleted');

        // SECURITY & VISIBILITY FILTERS
        if (isAdmin) {
            // Admin: Voir tout sauf ce qu'il a masqué pour lui-même
            // Note: On utilise .is() pour gérer le cas où la colonne serait NULL (backward compatibility)
            query = query.not('hidden_for_admin', 'is', true);
        } else {
            // Bénévole:
            // 1. Voir seulement ses tickets OU les annonces
            // 2. NE PAS voir ce qu'il a masqué
            query = query.not('hidden_for_volunteer', 'is', true);
            query = query.or(`user_id.eq.${user.id},category.eq.announcement`);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching tickets:", error);
            return { success: false, error };
        }

        // FORMATTING: Aplatir last_message
        const formatted = data.map(t => {
            const msgs = t.last_message;
            let content = null;
            if (Array.isArray(msgs) && msgs.length > 0) {
                // Tri pour être sûr d'avoir le dernier (par sécurité)
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
        // Double check permissions here could be good, but RLS + getTickets filtering usually enough for UI
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                profiles(first_name, last_name, is_admin)
            `)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) return { success: false, error };

        return { success: true, data };
    },

    /**
     * Récupère la liste des bénévoles (pour Admin uniquement)
     */
    async getAllVolunteers() {
        if (!store.state.profile?.is_admin) return { success: false, error: "Non autorisé" };

        const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('status', 'approved')
            .order('first_name');

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
            .select()
            .single();

        if (error) return { success: false, error };

        // Update 'last_message_at' et s'assurer que le ticket réapparaît s'il était masqué par l'autre partie ?
        // Pour l'instant on update juste la date.
        // Optionnel : on pourrait reset hidden_for_X = false si on veut que le nouveau message pop.
        // Décision : On unhide pour le destinataire pour qu'il voie la notif.

        const updatePayload = { last_message_at: new Date().toISOString() };

        // Unhide logic (Best UX)
        // Si c'est un bénévole qui écrit, on unhide pour l'admin (au cas où il l'aurait caché)
        // Si c'est un admin, on unhide pour le bénévole.
        // Simplification : On reset les deux flags à false à chaque nouveau message pour être sûr qu'il est vu.
        updatePayload.hidden_for_admin = false;
        updatePayload.hidden_for_volunteer = false;

        await supabase.from('tickets').update(updatePayload).eq('id', ticketId);

        return { success: true, data };
    },

    /**
     * Crée un nouveau ticket Support
     */
    async createTicket(subject, content) {
        const user = store.state.user;

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
        if (!store.state.profile?.is_admin) return { success: false, error: "Non autorisé" };

        const { data: ticket, error: tErr } = await supabase
            .from('tickets')
            .insert([{
                user_id: user.id,
                subject: subject,
                category: 'announcement'
            }])
            .select()
            .single();

        if (tErr) return { success: false, error: tErr };

        if (content) {
            await this.sendMessage(ticket.id, content);
        }

        return { success: true, data: ticket };
    },

    /**
     * Crée un message direct à un bénévole (Admin seulement)
     */
    async createDirectMessage(targetUserId, subject, content) {
        const user = store.state.user;
        if (!store.state.profile?.is_admin) return { success: false, error: "Non autorisé" };

        const { data: ticket, error: tErr } = await supabase
            .from('tickets')
            .insert([{
                user_id: targetUserId,
                subject: subject,
                category: 'support' // Direct = support privé
            }])
            .select()
            .single();

        if (tErr) return { success: false, error: tErr };

        if (content) {
            await this.sendMessage(ticket.id, content);
        }

        return { success: true, data: ticket };
    },

    /**
     * Abonnement aux messages
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

    // --- TICKET MANAGEMENT (Nouvelle logique) ---

    /**
     * Masquer la conversation pour l'utilisateur courant (Soft Delete)
     */
    async hideTicket(ticketId) {
        const isAdmin = store.state.profile?.is_admin && store.state.adminMode;

        const column = isAdmin ? 'hidden_for_admin' : 'hidden_for_volunteer';

        const { error } = await supabase
            .from('tickets')
            .update({ [column]: true })
            .eq('id', ticketId);

        if (error) {
            console.error("Error hiding ticket:", error);
            return { success: false, error };
        }
        return { success: true };
    },

    /**
     * Ferme/résout un ticket (Admin uniquement)
     */
    async closeTicket(ticketId) {
        if (!store.state.profile?.is_admin) return { success: false, error: "Non autorisé" };

        const { error } = await supabase
            .from('tickets')
            .update({ status: 'closed' })
            .eq('id', ticketId);

        if (error) return { success: false, error };
        return { success: true };
    },

    /**
     * Supprime DÉFINITIVEMENT un ticket (Admin uniquement - Hard Delete)
     */
    async deleteTicket(ticketId) {
        // Seul l'admin peut hard-delete
        if (!store.state.profile?.is_admin) {
            return { success: false, error: "Non autorisé. Utilisez 'Masquer' à la place." };
        }

        // 1. Supprimer messages
        const { error: msgErr } = await supabase
            .from('messages')
            .delete()
            .eq('ticket_id', ticketId);

        if (msgErr) return { success: false, error: msgErr };

        // 2. Supprimer ticket
        const { error: ticketErr } = await supabase
            .from('tickets')
            .delete()
            .eq('id', ticketId);

        if (ticketErr) return { success: false, error: ticketErr };

        return { success: true };
    }
};
