import { supabase } from '../../services/supabase.js';

export const PolesService = {
    async getAllTeams() {
        const { data, error } = await supabase.from('teams').select('*').order('name');
        if (error) throw error;
        return data;
    },

    async getLeaders() {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, role_title, pole_id')
            .not('pole_id', 'is', null)
            .not('role_title', 'is', null);

        if (error) throw error;
        return data;
    },

    async getMyInterests(userId) {
        const { data, error } = await supabase
            .from('pole_interests')
            .select('team_id')
            .eq('user_id', userId);

        if (error) throw error;
        return data ? data.map(i => i.team_id) : [];
    },

    async toggleInterest(userId, teamId, isCurrentlyInterested) {
        if (isCurrentlyInterested) {
            const { error } = await supabase
                .from('pole_interests')
                .delete()
                .eq('user_id', userId)
                .eq('team_id', teamId);
            if (error) throw error;
            return false; // New state: Not interested
        } else {
            const { error } = await supabase
                .from('pole_interests')
                .insert([{ user_id: userId, team_id: teamId }]);
            if (error) throw error;
            return true; // New state: Interested
        }
    },

    async createTeam(teamData) {
        const { data, error } = await supabase.from('teams').insert([teamData]).select().single();
        if (error) throw error;
        return data;
    },

    async updateTeam(id, teamData) {
        const { error } = await supabase.from('teams').update(teamData).eq('id', id);
        if (error) throw error;
    },

    async deleteTeam(id) {
        const { error } = await supabase.from('teams').delete().eq('id', id);
        if (error) throw error;
    },

    async getCandidates(teamId) {
        const { data, error } = await supabase
            .from('pole_interests')
            .select('created_at, profiles(id, first_name, last_name, phone, email, status)')
            .eq('team_id', teamId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }
};
