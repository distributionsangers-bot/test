
import { supabase } from '../../services/supabase.js';

export const ScannerService = {

    // Traite le contenu scanné
    async processScan(qrData) {
        // 1. Validation du format
        if (!qrData || qrData.type !== 'attendance_validation' || !qrData.shift_id) {
            return {
                success: false,
                message: "Ce QR Code n'est pas valide pour la présence."
            };
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, message: "Utilisateur non connecté." };

            // 2. Appel RPC sécurisé
            const { data, error } = await supabase.rpc('validate_attendance', {
                p_shift_id: qrData.shift_id,
                p_user_id: user.id
            });

            if (error) {
                // Gestion fine des erreurs SQL renvoyées
                console.error("RPC Error:", error);
                return { success: false, message: error.message || "Erreur de validation." };
            }

            // 3. Gestion des retours logiques (ex: Quota)
            if (data.penalty) {
                return {
                    success: true, // C'est un succès technique (présence notée), mais avec avertissement
                    warning: true,
                    message: `Validé (HORS QUOTA). ${data.message}`,
                    hours_added: 0
                };
            }

            return {
                success: true,
                message: "Présence validée avec succès !",
                hours_added: data.hours_added
            };

        } catch (err) {
            console.error(err);
            return { success: false, message: "Erreur technique lors du traitement." };
        }
    }
};
