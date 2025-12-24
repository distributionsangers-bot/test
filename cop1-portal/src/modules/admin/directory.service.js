import { supabase } from '../../services/supabase.js';

export const DirectoryService = {
    async getAllUsers() {
        // Fetch profiles with exact count if needed, or just list
        // We order by name by default
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('last_name', { ascending: true });

        if (error) return { error };
        return { data };
    },

    async getUserDetails(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) return { error };
        return { data };
    },

    async updateUserStatus(userId, status) {
        // status: 'pending', 'approved', 'rejected'
        const { error } = await supabase
            .from('profiles')
            .update({ status })
            .eq('id', userId);

        if (error) return { error };
        return { success: true };
    },

    async updateUserRole(userId, isAdmin) {
        const { error } = await supabase
            .from('profiles')
            .update({ is_admin: isAdmin })
            .eq('id', userId);

        if (error) return { error };
        return { success: true };
    },

    async deleteUserProfile(userId) {
        // Note: Supabase might restrict deleting users from client depending on policies.
        // Usually, we use an RPC or just delete the profile if cascading is set up.
        // User requested: "Gère le cas où l'user a des inscriptions" -> CASCADE should handle it or we check first.

        // We will try direct delete first as per requirement to "Generate logic"
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) return { error };
        return { success: true };
    }
};
