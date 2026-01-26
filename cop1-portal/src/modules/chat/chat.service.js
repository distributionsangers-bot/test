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
        const myId = store.state.user?.id;

        // 1. Base Query
        let query = supabase
            .from('tickets')
            .select(`
                *,
                last_message:messages(content, created_at, user_id, deleted_at),
                profiles:user_id(first_name, last_name, email),
                assigned_admin:assigned_admin_id(first_name, last_name)
            `)
            .neq('status', 'deleted')
            .order('last_message_at', { ascending: false });

        // 2. Security & Visibility Filters
        if (isAdmin) {
            // Admin sees:
            // - Tickets assigned to them (assigned_admin_id = myId)
            // - OR Global support tickets (assigned_admin_id IS NULL AND category != 'direct') 
            //   (Actually 'direct' w/o assigned_admin shouldn't exist, but 'support' is global)
            // - AND not hidden

            // Logic:
            // (assigned_admin_id == ME) OR (assigned_admin_id IS NULL)

            query = query.not('hidden_for_admin', 'is', true)
                .or(`assigned_admin_id.eq.${myId},assigned_admin_id.is.null`);
        } else {
            // Volunteer sees:
            // - Tickets they created (user_id = me)
            // - OR Announcements (category = announcement)
            // - AND not hidden

            // Note: assigned_admin_id doesn't affect visibility for volunteers, 
            // they just see their threads.

            query = query.not('hidden_for_volunteer', 'is', true)
                .or(`user_id.eq.${myId},category.eq.announcement`);
        }

        const { data, error } = await query;

        if (error) {
            console.error("ChatService.getTickets Error:", error);
            return { success: false, error };
        }

        // 3. Formatting & Unread Count Logic
        const formatted = data.map(t => {
            const msgs = t.last_message;
            // On prend le plus récent
            const last = Array.isArray(msgs) && msgs.length > 0
                ? msgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
                : null;

            // Calcul "Non lu"
            const myLastRead = isAdmin ? t.admin_last_read_at : t.volunteer_last_read_at;
            // Un message est non lu si :
            // 1. Il existe
            // 2. Sa date de création est après ma dernière lecture
            // 3. Ce n'est pas moi qui l'ai envoyé
            const lastMsgDate = last?.created_at ? new Date(last.created_at) : null;
            const myLastReadDate = myLastRead ? new Date(myLastRead) : new Date(0);
            const isUnread = lastMsgDate && !last.deleted_at && lastMsgDate > myLastReadDate && last.user_id !== store.state.user.id;

            // Gestion contenu supprimé
            const content = last?.deleted_at ? "🚫 Message supprimé" : last?.content;

            return {
                ...t,
                last_message: content,
                last_message_date: last ? last.created_at : t.created_at,
                is_unread: !!isUnread
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
                profiles(first_name, last_name, is_admin),
                parent:reply_to_id(content, profiles(first_name, last_name))
            `)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) return { success: false, error };
        return { success: true, data };
    },

    /**
     * Récupère un message spécifique par son ID.
     */
    async getMessageById(messageId) {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('id', messageId)
            .single();

        if (error) return { success: false, error };
        return { success: true, data };
    },

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

    async getAllAdmins() {
        if (!store.state.user) return { success: false, error: "Non connecté" };

        const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('is_admin', true)
            .order('first_name');

        if (error) return { success: false, error };
        return { success: true, data };
    },

    // =========================================================================
    // ⚡ ACTIONS
    // =========================================================================

    /**
     * Envoie un message (avec support Reply).
     */
    async sendMessage(ticketId, content, replyToId = null) {
        if (!content?.trim()) return { success: false };
        const user = store.state.user;

        // 1. Insert Message
        const { data, error } = await supabase
            .from('messages')
            .insert([{
                ticket_id: ticketId,
                user_id: user.id,
                content: content.trim(),
                reply_to_id: replyToId
            }])
            .select()
            .single();

        if (error) return { success: false, error };

        // 2. Touch Ticket updates
        await supabase
            .from('tickets')
            .update({
                last_message_at: new Date().toISOString(),
                hidden_for_admin: false,
                hidden_for_volunteer: false
                // Note : on ne met PAS à jour le last_read_at ici, 
                // c'est "markAsRead" quand on ouvre qui le fait.
            })
            .eq('id', ticketId);

        return { success: true, data };
    },

    /**
     * Marque la conversation comme lue pour l'utilisateur courant.
     */
    async markAsRead(ticketId) {
        const isAdmin = store.state.profile?.is_admin && store.state.adminMode;
        const column = isAdmin ? 'admin_last_read_at' : 'volunteer_last_read_at';

        await supabase
            .from('tickets')
            .update({ [column]: new Date().toISOString() })
            .eq('id', ticketId);
    },

    async editMessage(messageId, newContent) {
        if (!newContent?.trim()) return { success: false, error: "Contenu vide" };

        const { error } = await supabase
            .from('messages')
            .update({
                content: newContent.trim(),
                edited_at: new Date().toISOString()
            })
            .eq('id', messageId)
            .eq('user_id', store.state.user.id); // Sécurité côté client (RLS doit aussi vérifier)

        return { success: !error, error };
    },

    async deleteMessage(messageId) {
        // Soft Key Delete
        const { error } = await supabase
            .from('messages')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', messageId)
            .eq('user_id', store.state.user.id);

        return { success: !error, error };
    },

    async createTicket({ type, subject, content, targetUserId }) {
        const user = store.state.user;
        let payload = {
            subject,
            category: type,
            user_id: user.id,
            status: 'open'
        };

        if (type === 'announcement') {
            if (!store.state.profile?.is_admin) return { success: false, error: "Non autorisé" };
        }
        else if (type === 'direct') {
            // Direct messages
            if (!targetUserId) return { success: false, error: "Destinataire requis" };

            // Scenario A: Admin -> Volunteer
            if (store.state.profile?.is_admin) {
                payload.user_id = targetUserId; // The ticket belongs to the volunteer
                payload.assigned_admin_id = user.id; // Assign to me (Admin) automatically
                payload.category = 'support'; // It's a support thread, just private
            }
            // Scenario B: Volunteer -> Admin
            else {
                // Volunteer creates ticket for themselves
                payload.user_id = user.id;
                payload.assigned_admin_id = targetUserId; // Assign to the target Admin
                payload.category = 'support';
            }
        }
        else if (type === 'support') {
            // Global Support (No assigned admin)
            payload.category = 'support';
            payload.assigned_admin_id = null;
        }
        else {
            return { success: false, error: "Type de ticket invalide" };
        }

        const { data: ticket, error } = await supabase
            .from('tickets')
            .insert([payload])
            .select()
            .single();

        if (error) return { success: false, error };

        // Envoie le message initial s'il y a du contenu
        if (content?.trim()) {
            await this.sendMessage(ticket.id, content);
        }

        return { success: true, data: ticket };
    },

    /**
     * Helper pour créer un ticket direct vers un utilisateur
     */
    async createTicketByUser(targetUserId, subject, content) {
        // 1. Check if existing ticket? (Optional optimization, avoiding duplicates)
        // For now, simple creation
        return this.createTicket({
            type: 'direct',
            targetUserId,
            subject,
            content
        });
    },

    async hideTicket(ticketId) {
        const isAdmin = store.state.profile?.is_admin && store.state.adminMode;
        const column = isAdmin ? 'hidden_for_admin' : 'hidden_for_volunteer';

        const { error } = await supabase
            .from('tickets')
            .update({ [column]: true })
            .eq('id', ticketId);

        return { success: !error, error };
    },

    async deleteTicket(ticketId) {
        if (!store.state.profile?.is_admin) return { success: false, error: "Non autorisé" };

        await supabase.from('messages').delete().eq('ticket_id', ticketId);
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
                { event: '*', schema: 'public', table: 'messages', filter: `ticket_id=eq.${ticketId}` },
                (payload) => callback(payload) // On passe tout le payload pour gérer INSERT/UPDATE
            )
            .subscribe();

        return {
            unsubscribe: () => supabase.removeChannel(channel),
            sendTyping: () => channel.track({ user: store.state.user.id, typing: true }), // Presence could be better but broadcast is easier for simple signal
            // ... For simple broadcast typing:
            broadcastTyping: () => channel.send({
                type: 'broadcast',
                event: 'typing',
                payload: { userId: store.state.user.id }
            })
        };
    }
};
