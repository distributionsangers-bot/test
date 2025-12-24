
import { supabase } from '../../services/supabase.js';

export const ParticipantsService = {

    // Récupérer les inscrits d'un créneau spécifique
    async getShiftParticipants(shiftId) {
        // On récupère les inscriptions avec les profils associés
        const { data, error } = await supabase
            .from('registrations')
            .select(`
                id,
                status,
                check_in_time,
                profiles:user_id (
                    id,
                    first_name,
                    last_name,
                    email,
                    phone,
                    avatar_url
                )
            `)
            .eq('shift_id', shiftId);

        if (error) return { error };
        return { data };
    },

    // Récupérer les infos du créneau pour le titre de la modale
    async getShiftDetails(shiftId) {
        const { data, error } = await supabase
            .from('shifts')
            .select('*, events(title, date)')
            .eq('id', shiftId)
            .single();

        if (error) return { error };
        return { data };
    },

    // Valider/Refuser la présence (check-in)
    async validateParticipant(registrationId, isPresent) {
        // Si présent, on met le check_in_time, sinon null
        const updates = {
            status: isPresent ? 'confirmed' : 'registered', // ou autre logique statut
            check_in_time: isPresent ? new Date().toISOString() : null
        };

        const { error } = await supabase
            .from('registrations')
            .update(updates)
            .eq('id', registrationId);

        if (error) return { error };
        return { success: true };
    },

    // Désinscrire un bénévole
    async removeParticipant(registrationId) {
        const { error } = await supabase
            .from('registrations')
            .delete()
            .eq('id', registrationId);

        if (error) return { error };
        return { success: true };
    }
};
