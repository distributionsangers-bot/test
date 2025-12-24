import { supabase } from '../../services/supabase.js';

export const ParticipantsService = {
    async getShiftRegistrations(shiftId) {
        return await supabase
            .from('registrations')
            .select('*, profiles(first_name, last_name, phone, status)')
            .eq('shift_id', shiftId);
    },

    async updateAttendance(regId, isPresent) {
        return await supabase
            .from('registrations')
            .update({ attended: isPresent })
            .eq('id', regId);
    },

    async deleteRegistration(regId) {
        return await supabase
            .from('registrations')
            .delete()
            .eq('id', regId);
    }
};
