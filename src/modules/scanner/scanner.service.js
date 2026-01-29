import { supabase } from '../../services/supabase.js';
import { store } from '../../core/store.js';

export const ScannerService = {
    async validateAttendance(shiftId) {
        const user = store.state.user;
        if (!user) throw new Error("Utilisateur non connecté");

        const { data, error } = await supabase.rpc('validate_attendance', {
            p_shift_id: shiftId,
            p_user_id: user.id
        });

        if (error) throw error;
        return data;
    },

    async processScan(data) {
        // Logique centralisée si besoin
        if (data.type === 'shift' || data.type === 'attendance_validation') {
            return this.validateAttendance(data.shift_id);
        }
        throw new Error("Type de QR inconnu");
    }
};
