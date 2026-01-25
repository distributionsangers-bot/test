import { supabase } from '../../services/supabase.js';
import { APP_CONFIG } from '../../core/constants.js';

export const ProfileService = {
    /**
     * Fetches Profile AND History for a given User ID
     * Joins with Shifts and Events to get full details
     */
    async getProfileAndHistory(userId) {
        try {
            // 1. Fetch Profile
            const profilePromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            // 2. Fetch History (Registrations -> Shift -> Event)
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
     * Updates user profile with all editable fields
     * Handles password update if provided (using Auth API)
     */
    async updateProfile(userId, formData) {
        try {
            const updates = {};

            // All editable fields
            if (formData.first_name !== undefined) updates.first_name = formData.first_name;
            if (formData.last_name !== undefined) updates.last_name = formData.last_name;
            if (formData.phone !== undefined) updates.phone = formData.phone;
            if (formData.has_permit !== undefined) updates.has_permit = formData.has_permit;
            if (formData.mandatory_hours !== undefined) updates.mandatory_hours = formData.mandatory_hours;

            // 1. Update Profile Data (only if there are updates)
            if (Object.keys(updates).length > 0) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', userId);

                if (profileError) throw profileError;
            }

            // 2. Update Password if provided
            if (formData.password && formData.password.trim()) {
                const { error: authError } = await supabase.auth.updateUser({
                    password: formData.password
                });
                if (authError) throw authError;
            }

            return { success: true };

        } catch (error) {
            console.error("Update Profile Error:", error);
            return { error };
        }
    },

    /**
     * Uploads avatar to Supabase Storage and updates profile
     * @param {string} userId - User ID
     * @param {File} file - Image file to upload
     * @returns {Promise<{url, error}>}
     */
    async uploadAvatar(userId, file) {
        try {
            const bucketName = APP_CONFIG?.BUCKET_AVATARS || 'avatars';
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}.${fileExt}`;
            const filePath = fileName;

            // 1. Upload to storage (upsert to replace existing)
            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file, {
                    upsert: true,
                    contentType: file.type
                });

            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data: urlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            const publicUrl = urlData?.publicUrl;

            // Add cache buster to URL
            const finalUrl = publicUrl ? `${publicUrl}?t=${Date.now()}` : null;

            // 3. Update profile with new avatar URL
            if (finalUrl) {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ avatar_url: finalUrl })
                    .eq('id', userId);

                if (updateError) throw updateError;
            }

            return { url: finalUrl, success: true };

        } catch (error) {
            console.error("Upload Avatar Error:", error);
            return { error };
        }
    },

    /**
     * Deletes the user account securely via RPC
     */
    async deleteAccount(userId) {
        try {
            const { error } = await supabase.rpc('delete_own_account');
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error("Delete Account Error:", error);
            return { error };
        }
    }
};
