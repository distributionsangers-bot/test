import { supabase } from '../../services/supabase.js';

export const ProfileService = {
    /**
     * Fetches Profile AND History for a given User ID
     * Joins with Shifts and Events to get full details
     */
    async getProfileAndHistory(userId) {
        try {
            // 1. Fetch Profile (with total_hours which is likely a column or view)
            const profilePromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            // 2. Fetch History (Registrations -> Shift -> Event)
            // We need to join: registrations -> shifts -> events
            const historyPromise = supabase
                .from('registrations')
                .select(`
                    *,
                    shifts (
                        id,
                        title,
                        start_time,
                        end_time,
                        hours_value,
                        events (
                            id,
                            title,
                            date,
                            location
                        )
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            const [profileRes, historyRes] = await Promise.all([profilePromise, historyPromise]);

            if (profileRes.error) throw profileRes.error;
            if (historyRes.error) throw historyRes.error;

            return {
                profile: profileRes.data,
                history: historyRes.data || []
            };

        } catch (error) {
            console.error("Profile Service Error:", error);
            return { error };
        }
    },

    /**
     * Updates user profile (phone, etc.)
     * Handles password update if provided (using Auth API)
     */
    async updateProfile(userId, formData) {
        try {
            const updates = {};
            if (formData.phone) updates.phone = formData.phone;
            // Add other fields as necessary (e.g. avatar_url if we handle upload separately)

            // 1. Update Profile Data
            const { error: profileError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId);

            if (profileError) throw profileError;

            // 2. Update Password if provided
            if (formData.password) {
                const { error: authError } = await supabase.auth.updateUser({
                    password: formData.password
                });
                if (authError) throw authError;
            }

            return { success: true };

        } catch (error) {
            return { error };
        }
    },

    /**
     * Deletes the user account securely via RPC
     * (Assumes 'delete_own_account' RPC exists as per legacy code)
     * Or uses Admin API if this is an admin action? 
     * Requirement says: "deleteAccount(userId) : (Sécurisé) Pour la suppression de compte."
     * User prompt implies "Supprimer mon compte" -> RPC 'delete_own_account'
     */
    async deleteAccount(userId) {
        try {
            // If deleting self
            const { error } = await supabase.rpc('delete_own_account');
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { error };
        }
    }
};
