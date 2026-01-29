
import { supabase } from './supabase.js';

export const AuthService = {
    /**
     * Logs in a user with email and password.
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<{user: object, session: object, error: object}>}
     */
    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { user: data?.user, session: data?.session, error };
    },

    /**
     * Registers a new user with metadata and optional proof file.
     * @param {string} email 
     * @param {string} password 
     * @param {object} metadata - { first_name, last_name, phone, has_permit, mandatory_hours }
     * @returns {Promise<{user: object, session: object, error: object}>}
     */
    async register(email, password, metadata) {
        // 1. SignUp with Metadata
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });

        return { user: data?.user, session: data?.session, error };
    },

    /**
     * Uploads the proof file for a user.
     * @param {string} userId 
     * @param {File} file 
     * @returns {Promise<{error: object}>}
     */
    async uploadProof(userId, file) {
        const { error } = await supabase.storage
            .from('proofs')
            .upload(userId, file, { upsert: true });

        return { error };
    },

    /**
     * Sends a password reset email.
     * @param {string} email 
     * @returns {Promise<{error: object}>}
     */
    async resetPassword(email) {
        let error = null;
        try {
            // Try v2 method first or fallback if needed (Supabase JS v2 usually has resetPasswordForEmail on auth)
            const result = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin
            });
            error = result.error;
        } catch (err) {
            error = err;
        }
        return { error };
    },

    /**
     * Logs out the user.
     */
    async logout() {
        await supabase.auth.signOut();
    }
};
