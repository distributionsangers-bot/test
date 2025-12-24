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
            .order('updated_at', { ascending: false });

        if (!isAdmin) {
            // Pour un bénévole : Ses tickets OU les annonces
            // Note: La syntaxe .or() de Supabase est puissante
            query = query.or(`user_id.eq.${user.id},category.eq.announcement`);
        }

        // On récupère aussi le profil de l'auteur du ticket pour l'affichage (si support)
        // Mais pour l'instant restons simple, on supposera que le titre du ticket suffit
        // Ou on peut faire une jointure si nécessaire.

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching tickets:", error);
            return { success: false, error };
        }

        // Petit traitement pour avoir le dernier message proprement
        const formatted = data.map(t => {
            // last_message est un tableau à cause de la relation one-to-many, on prend le plus récent sil est trié ou on tri
            // En général on limite la sous-requête, mais ici Supabase JS le fait différemment.
            // Simplifions : on va fetcher les messages séparément ou assumer que le backend met à jour 'updated_at' du ticket.
            // Pour l'aperçu, on peut utiliser le champ 'last_message_preview' s'il existe, sinon on le laisse vide pour l'instant.
            return t;
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
                profile:profiles(first_name, last_name, is_admin)
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

        // Optionnel : Mettre à jour le 'updated_at' du ticket pour le faire remonter
        await supabase.from('tickets').update({ updated_at: new Date() }).eq('id', ticketId);

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
                category: 'support',
                status: 'open'
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
                category: 'announcement',
                status: 'open'
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

    // --- REALTIME ---

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
    }
};
