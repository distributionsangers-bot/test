import { supabase } from '../../services/supabase.js';
import { requireAdmin } from '../../services/auth-guard.js';

export const PolesService = {
    /**
     * Récupère tous les pôles
     */
    async getAllTeams() {
        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .order('display_order', { ascending: true })
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
            .order('display_order', { ascending: true })
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
            .order('display_order', { ascending: true })
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
        const guard = requireAdmin('retirer un intérêt candidat');
        if (guard) throw new Error(guard.error.message);
        const { error, count } = await supabase
            .from('pole_interests')
            .delete({ count: 'exact' })
            .eq('user_id', userId)
            .eq('team_id', teamId);

        if (error) throw error;
        if (count === 0) throw new Error("Permission refusée ou élément introuvable");
    },

    /**
     * Crée un nouveau pôle
     */
    async createTeam(poleData) {
        const guard = requireAdmin('créer un pôle');
        if (guard) throw new Error(guard.error.message);
        const { error } = await supabase
            .from('teams')
            .insert([poleData]);
        if (error) throw error;
    },

    /**
     * Met à jour un pôle
     */
    async updateTeam(id, poleData) {
        const guard = requireAdmin('modifier un pôle');
        if (guard) throw new Error(guard.error.message);
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
        const guard = requireAdmin('supprimer un pôle');
        if (guard) throw new Error(guard.error.message);
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
        const guard = requireAdmin('assigner un responsable');
        if (guard) throw new Error(guard.error.message);
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
        const guard = requireAdmin('retirer un responsable');
        if (guard) throw new Error(guard.error.message);
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
        const guard = requireAdmin('modifier le titre d\'un responsable');
        if (guard) throw new Error(guard.error.message);
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
     * Échange l'ordre d'affichage de deux équipes
     */
    async swapDisplayOrder(idA, orderA, idB, orderB) {
        const guard = requireAdmin('modifier l\'ordre d\'affichage');
        if (guard) throw new Error(guard.error.message);
        const { error: e1 } = await supabase
            .from('teams')
            .update({ display_order: orderB })
            .eq('id', idA);
        if (e1) throw e1;

        const { error: e2 } = await supabase
            .from('teams')
            .update({ display_order: orderA })
            .eq('id', idB);
        if (e2) throw e2;
    },

    /**
     * Récupère le nombre d'intéressés par pôle (tous les pôles en une requête)
     * @returns {Promise<Object>} Map { teamId: count }
     */
    async getAllInterestCounts() {
        const { data, error } = await supabase
            .from('pole_interests')
            .select('team_id');

        if (error) {
            console.error('getAllInterestCounts error:', error);
            return {};
        }

        // Group by team_id and count
        const counts = {};
        (data || []).forEach(row => {
            counts[row.team_id] = (counts[row.team_id] || 0) + 1;
        });
        return counts;
    },

    /**
     * Compte le nombre total d'intérêts (tous pôles confondus)
     * @returns {Promise<number>}
     */
    async getTotalInterestCount() {
        const { count, error } = await supabase
            .from('pole_interests')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('getTotalInterestCount error:', error);
            return 0;
        }
        return count || 0;
    },
};
