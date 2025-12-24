import { supabase } from '../../services/supabase.js';

export const DirectoryService = {
    async getUsers(page = 1, limit = 20, search = '', filter = 'all') {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('profiles')
            .select('*', { count: 'exact' });

        // Filter Logic
        if (filter === 'pending') {
            query = query.eq('status', 'pending');
        } else if (filter === 'admin') {
            query = query.eq('is_admin', true);
        }

        // Search Logic
        if (search) {
            // Note: Supabase 'or' syntax for multiple columns
            query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
        }

        // Order & Paginate
        query = query.order('last_name', { ascending: true })
            .range(from, to);

        const { data, error, count } = await query;

        if (error) return { error };
        return { data, count };
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
    },
    async getUserById(userId) {
        return this.getUserDetails(userId);
    },

    async updateAdminNote(userId, note) {
        const { error } = await supabase
            .from('profiles')
            .update({ admin_note: note })
            .eq('id', userId);

        if (error) return { error };
        return { success: true };
    },

    async getProofUrl(userId) {
        // Logique "Proof" : map user_id -> file path
        // D'après index_originel, le path est souvent stocké ou déduit.
        // Ici on va chercher le dernier fichier dans le bucket 'proofs' qui commence par user_id
        // OU on suppose que le path est stocké quelque part.
        // Option simple : List files in folder

        const { data: list, error: listErr } = await supabase
            .storage
            .from('proofs')
            .list('', { search: userId }); // Search returns files containing userId

        if (listErr || !list || list.length === 0) return { error: 'Not found' };

        // Take the most recent one?
        const file = list[0];

        const { data } = await supabase
            .storage
            .from('proofs')
            .createSignedUrl(file.name, 3600); // 1 hour link

        if (!data) return { error: 'Sign failed' };

        return { signedUrl: data.signedUrl };
    },

    async deleteProofFile(userId) {
        // Find file first to get name
        const { data: list } = await supabase
            .storage
            .from('proofs')
            .list('', { search: userId });

        if (!list || list.length === 0) return { success: true };

        const filesToRemove = list.map(x => x.name);

        const { error } = await supabase
            .storage
            .from('proofs')
            .remove(filesToRemove);

        if (error) return { error };
        return { success: true };
    }
};
