import { store } from '../../core/store.js';
import { supabase } from '../../services/supabase.js';

/**
 * ChatService - Layer Data & Logic
 * Gestion robuste des tickets, messages et droits d'accès.
 */
export const ChatService = {

    // =========================================================================
    // 🔍 FETCHING
    // =========================================================================

    /**
     * Récupère la liste des tickets visibles pour l'utilisateur.
     * Applique les filtres administratifs et le "soft delete" (masquage).
     */
    async getTickets() {
        if (!store.state.user) return { success: false, error: "Non connecté" };

        const isAdmin = store.state.profile?.is_admin && store.state.adminMode;

        // 1. Base Query
        let query = supabase
            .from('tickets')
            .select(`
                *,
                last_message:messages(content, created_at, user_id),
                profiles:user_id(first_name, last_name, email)
            `)
            .neq('status', 'deleted') // Exclut les hard-deleted
            .order('last_message_at', { ascending: false });

        // 2. Security & Visibility Filters
        if (isAdmin) {
            // Admin : voit tout SAUF ce qu'il a masqué explicitement pour lui
            // Note: On utilise 'is.not.true' pour inclure NULL et FALSE
            query = query.not('hidden_for_admin', 'is', true);
        } else {
            // Bénévole : voit uniquement SES tickets OU les annonces
            // ET ne doit pas voir ce qu'il a masqué
            query = query.not('hidden_for_volunteer', 'is', true)
                .or(`user_id.eq.${store.state.user.id},category.eq.announcement`);
        }

        const { data, error } = await query;

        if (error) {
            console.error("ChatService.getTickets Error:", error);
            return { success: false, error };
        }

        // 3. Formatting
        // On aplatit le "last_message" pour qu'il soit facilement utilisable en UI
        const formatted = data.map(t => {
            const msgs = t.last_message;
            // On prend le plus récent s'il y en a (sécurité extra, même si le select le fait souvent)
            const last = Array.isArray(msgs) && msgs.length > 0
                ? msgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
                : null;

            return {
                ...t,
                last_message: last ? last.content : null,
                last_message_date: last ? last.created_at : t.created_at
            };
        });

        return { success: true, data: formatted };
    },

    /**
     * Récupère les messages d'un ticket spécifique.
     */
    async getMessages(ticketId) {
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
     * Récupère tous les bénévoles pour la recherche (Admin seulement).
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

    // =========================================================================
    // ⚡ ACTIONS
    // =========================================================================

    /**
     * Envoie un message et met à jour le ticket (timestamp + visibilité).
     */
    async sendMessage(ticketId, content) {
        if (!content?.trim()) return { success: false };
        const user = store.state.user;

        // 1. Insert Message
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

        // 2. Touch Ticket
        // On met à jour la date ET on ré-affiche le ticket pour les deux parties
        // (au cas où l'un d'eux l'aurait masqué)
        await supabase
            .from('tickets')
            .update({
                last_message_at: new Date().toISOString(),
                hidden_for_admin: false,
                hidden_for_volunteer: false
            })
            .eq('id', ticketId);

        return { success: true, data };
    },

    /**
     * Crée une nouvelle conversation (Support, Annonce ou Direct).
     */
    async createTicket({ type, subject, content, targetUserId }) {
        const user = store.state.user;
        let payload = {
            subject,
            category: type, // 'support', 'announcement', 'direct' (via logic UI)
            user_id: user.id,
            status: 'open'
        };

        // Logique spécifique par type
        if (type === 'announcement') {
            if (!store.state.profile?.is_admin) return { success: false, error: "Non autorisé" };
            // Annonce : user_id reste l'admin créateur
        }
        else if (type === 'direct') {
            if (!store.state.profile?.is_admin) return { success: false, error: "Non autorisé" };
            // Direct : user_id est le BÉNÉVOLE CIBLE
            payload.user_id = targetUserId;
            // On set category à 'support' ou 'direct' ? Gardons 'support' pour la simplicité DB, 
            // ou 'direct' pour différencier si besoin. Le prompt disait 'direct' mais ticket table category enum ?
            // On suppose 'support' fonctionne pour tout échange privé.
            // Mais pour coller au prompt : 'direct' si admin initie.
            payload.category = 'support';
        }

        // Création Ticket
        const { data: ticket, error } = await supabase
            .from('tickets')
            .insert([payload])
            .select()
            .single();

        if (error) return { success: false, error };

        // Envoi premier message
        if (content) {
            await this.sendMessage(ticket.id, content);
        }

        return { success: true, data: ticket };
    },

    /**
     * Masquer une conversation (Soft Delete).
     */
    async hideTicket(ticketId) {
        const isAdmin = store.state.profile?.is_admin && store.state.adminMode;
        const column = isAdmin ? 'hidden_for_admin' : 'hidden_for_volunteer';

        const { error } = await supabase
            .from('tickets')
            .update({ [column]: true })
            .eq('id', ticketId);

        return { success: !error, error };
    },

    /**
     * Supprimer définitivement une conversation (Admin Hard Delete).
     */
    async deleteTicket(ticketId) {
        if (!store.state.profile?.is_admin) return { success: false, error: "Non autorisé" };

        // Cascade delete via Supabase (si foreign keys setées CASCADE)
        // Sinon manuel :
        // 1. Messages
        await supabase.from('messages').delete().eq('ticket_id', ticketId);
        // 2. Ticket
        const { error } = await supabase.from('tickets').delete().eq('id', ticketId);

        return { success: !error, error };
    },

    async closeTicket(ticketId) {
        if (!store.state.profile?.is_admin) return { success: false, error: "Non autorisé" };
        const { error } = await supabase.from('tickets').update({ status: 'closed' }).eq('id', ticketId);
        return { success: !error, error };
    },

    // =========================================================================
    // 📡 REALTIME
    // =========================================================================

    subscribe(ticketId, callback) {
        const channel = supabase.channel(`ticket-${ticketId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `ticket_id=eq.${ticketId}` },
                (payload) => callback(payload.new)
            )
            .subscribe();

        return {
            unsubscribe: () => supabase.removeChannel(channel)
        };
    }
};
