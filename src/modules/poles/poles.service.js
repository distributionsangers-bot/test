import { supabase } from '../../services/supabase.js';

export const PolesService = {
    /**
     * Récupère tous les pôles
     */
    async getAllTeams() {
        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .order('name');

        if (error) {
            console.error(error);
            return [];
        }
        return data;
    },

    /**
     * Récupère les Directions (pôles sans parent)
     */
    async getDirections() {
        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .is('parent_id', null)
            .order('name');

        if (error) {
            console.error(error);
            return [];
        }
        return data;
    },

    /**
     * Récupère les pôles groupés par Direction (hiérarchie complète)
     * Retourne: { antenne: [...], directions: [...], poles: {directionId: [...]} }
     */
    async getTeamsHierarchy() {
        const { data: allTeams, error } = await supabase
            .from('teams')
            .select('*')
            .order('name');

        if (error) {
            console.error(error);
            return { antenne: [], directions: [], poles: {} };
        }

        // Séparer par type
        const antenne = allTeams.filter(t => t.team_type === 'antenne');
        const directions = allTeams.filter(t => !t.parent_id && t.team_type !== 'antenne');
        const poles = {};

        // Grouper les pôles par direction
        for (const team of allTeams) {
            if (team.parent_id) {
                if (!poles[team.parent_id]) {
                    poles[team.parent_id] = [];
                }
                poles[team.parent_id].push(team);
            }
        }

        return { antenne, directions, poles };
    },

    /**
     * Récupère les responsables (ceux qui ont un pole_id défini)
     */
    async getLeaders() {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, pole_id, role_title, photo_url')
            .not('pole_id', 'is', null);

        if (error) {
            console.error(error);
            return [];
        }
        return data;
    },

    /**
     * Récupère les intérêts de l'utilisateur courant (IDs des pôles)
     */
    async getMyInterests(userId) {
        if (!userId) return [];
        const { data, error } = await supabase
            .from('pole_interests')
            .select('team_id')
            .eq('user_id', userId);

        if (error) return [];
        return data.map(i => i.team_id);
    },

    /**
     * Signale ou retire l'intérêt pour un pôle
     */
    async toggleInterest(userId, teamId, isInterested) {
        if (isInterested) {
            // Remove
            const { error } = await supabase
                .from('pole_interests')
                .delete()
                .eq('user_id', userId)
                .eq('team_id', teamId);
            if (error) throw error;
        } else {
            // Add
            const { error } = await supabase
                .from('pole_interests')
                .insert([{ user_id: userId, team_id: teamId }]);
            if (error) throw error;
        }
    },

    /**
     * Supprime complètement un intérêt (Action Admin)
     */
    async removeCandidateInterest(userId, teamId) {
        const { error } = await supabase
            .from('pole_interests')
            .delete()
            .eq('user_id', userId)
            .eq('team_id', teamId);
        if (error) throw error;
    },

    /**
     * Crée un nouveau pôle
     */
    async createTeam(poleData) {
        const { error } = await supabase
            .from('teams')
            .insert([poleData]);
        if (error) throw error;
    },

    /**
     * Met à jour un pôle
     */
    async updateTeam(id, poleData) {
        const { error } = await supabase
            .from('teams')
            .update(poleData)
            .eq('id', id);
        if (error) throw error;
    },

    /**
     * Supprime un pôle
     */
    async deleteTeam(id) {
        // Nettoyage préalable des liens
        await supabase.from('pole_interests').delete().eq('team_id', id);
        // Les profiles.pole_id seront mis à NULL automatiquement si ON DELETE SET NULL, 
        // sinon on doit le faire manuellement :
        await supabase.from('profiles').update({ pole_id: null, role_title: null }).eq('pole_id', id);

        const { error } = await supabase
            .from('teams')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    /**
     * Récupère les candidats intéressés par un pôle
     */
    async getCandidates(teamId) {
        const { data, error } = await supabase
            .from('pole_interests')
            .select('created_at, user_id, profiles!inner(*)')
            .eq('team_id', teamId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            return [];
        }
        return data; // returns array of { created_at, profiles: {...} }
    },

    /**
     * Assigne un utilisateur comme responsable d'un pôle
     */
    async assignLeader(userId, poleId, roleTitle = 'Responsable') {
        const { error } = await supabase
            .from('profiles')
            .update({
                pole_id: poleId,
                role_title: roleTitle
            })
            .eq('id', userId);
        if (error) throw error;
    },

    /**
     * Retire un responsable de son pôle
     */
    async removeLeader(userId) {
        const { error } = await supabase
            .from('profiles')
            .update({
                pole_id: null,
                role_title: null // ou garder le titre ? Généralement on retire tout.
            })
            .eq('id', userId);
        if (error) throw error;
    },

    /**
     * Met à jour le titre du poste d'un responsable
     */
    async updateLeaderTitle(userId, newTitle) {
        const { error } = await supabase
            .from('profiles')
            .update({
                role_title: newTitle
            })
            .eq('id', userId);
        if (error) throw error;
    },

    /**
     * Recherche de bénévoles pour assignation (Autocomplétion)
     */
    async searchVolunteers(query) {
        if (!query || query.length < 2) return [];

        const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, photo_url')
            .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(10);

        if (error) {
            console.error(error);
            return [];
        }
        return data;
    },

    /**
     * Récupère ou créée une conversation avec un utilisateur (pour le contacter)
     * Utilise ChatService.createTicket si nécessaire, mais ici on retourne juste l'info
     * On peut déléguer ça au ChatService directement depuis la vue.
     */
};
