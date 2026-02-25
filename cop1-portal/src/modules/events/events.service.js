
import { supabase } from '../../services/supabase.js';

export const EventsService = {
    /**
     * Retrieves all future events descending by date.
     * Includes shifts and current registration counts.
     */
    async getAllEvents() {
        try {
            const d = new Date();
            const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const { data, error } = await supabase
                .from('events')
                .select('*, description, shifts(*, registrations(count))') // count checks how many regs total
                .gte('date', today)
                .order('date', { ascending: true });

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            console.error("EventsService.getAllEvents error:", error);
            return { data: [], error };
        }
    },

    /**
     * Retrieves global stats (counts) for future shifts via secure RPC
     * Bypasses RLS to show correct availability
     */
    async getShiftCounts() {
        try {
            const { data, error } = await supabase.rpc('get_future_shift_counts');
            if (error) throw error;
            // Convert array to map: { shiftId: { total: number, reservedTaken: number } }
            const map = {};
            (data || []).forEach(item => {
                map[item.shift_id] = {
                    total: item.total_count,
                    reservedTaken: item.reserved_taken
                };
            });
            return { data: map, error: null };
        } catch (error) {
            console.error("EventsService.getShiftCounts error:", error);
            // Fallback
            return { data: {}, error };
        }
    },

    /**
     * Retrieves the list of shift IDs the current user is registered for.
     */
    async getMyRegistrations(userId) {
        try {
            if (!userId) return { data: [], error: "No user ID" };

            const { data, error } = await supabase
                .from('registrations')
                .select('shift_id')
                .eq('user_id', userId);

            if (error) throw error;

            const ids = data.map(r => r.shift_id);
            return { data: ids, error: null };
        } catch (error) {
            console.error("EventsService.getMyRegistrations error:", error);
            return { data: [], error };
        }
    },

    /**
     * Handles joining or leaving a shift.
     * Use RPC 'register_to_shift' for join to handle concurrency/quotas.
     * Use DELETE for leave.
     */
    async toggleRegistration(shiftId, userId, isCurrentlyRegistered, note = null) {
        try {
            if (isCurrentlyRegistered) {
                // UNREGISTER (Secure RPC)
                const { error } = await supabase.rpc('unregister_from_shift', {
                    p_shift_id: shiftId
                });

                if (error) throw error;
                return { success: true, action: 'unregister', error: null };
            } else {
                // REGISTER (Secure RPC)
                const { error } = await supabase.rpc('register_to_shift', {
                    p_shift_id: shiftId,
                    p_note: note
                });

                if (error) throw error;
                return { success: true, action: 'register', error: null };
            }
        } catch (error) {
            console.error("EventsService.toggleRegistration error:", error);
            return { success: false, error };
        }
    }
};
