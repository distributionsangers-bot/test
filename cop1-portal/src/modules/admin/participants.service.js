/**
 * ============================================
 * PARTICIPANTS SERVICE
 * ============================================
 * Gère les participants aux événements :
 * - Récupération des inscriptions
 * - Check-in manuel (présence)
 * - Désinscription forcée
 * - Ajout manuel de participants
 * - Statistiques de participation
 * 
 * RESTAURÉ depuis index_originel.html
 * ============================================
 */

import { supabase } from '../../services/supabase.js';

export const ParticipantsService = {
    /**
     * Récupère toutes les inscriptions pour un créneau
     * @param {number} shiftId - ID du créneau
     * @returns {Promise<{data, error}>}
     */
    async getShiftRegistrations(shiftId) {
        try {
            const { data, error } = await supabase
                .from('registrations')
                .select(`
                    *,
                    note,
                    profiles (
                        id,
                        first_name,
                        last_name,
                        phone,
                        email,
                        status,
                        has_permit,
                        mandatory_hours
                    )
                `)
                .eq('shift_id', shiftId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erreur récupération participants:', error);
            return { data: null, error };
        }
    },

    /**
     * Récupère toutes les inscriptions pour un événement (tous créneaux)
     * @param {number} eventId - ID de l'événement
     * @returns {Promise<{data, error}>}
     */
    async getEventRegistrations(eventId) {
        try {
            const { data, error } = await supabase
                .from('registrations')
                .select(`
                    *,
                    profiles (
                        id,
                        first_name,
                        last_name,
                        phone,
                        email
                    ),
                    shifts!inner (
                        id,
                        title,
                        event_id
                    )
                `)
                .eq('shifts.event_id', eventId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erreur récupération participants événement:', error);
            return { data: null, error };
        }
    },

    /**
     * Met à jour la présence d'un participant (check-in manuel)
     * RESTAURÉ depuis index_originel.html
     * @param {number} regId - ID de l'inscription
     * @param {boolean} isPresent - Présent ou non
     * @returns {Promise<{data, error}>}
     */
    async updateAttendance(regId, isPresent) {
        try {
            // Use RPC to handle hours calculation atomically
            const { data, error } = await supabase.rpc('toggle_attendance', {
                p_reg_id: regId,
                p_is_present: isPresent
            });

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erreur mise à jour présence:', error);
            return { data: null, error };
        }
    },

    /**
     * Désinscrit un participant (admin uniquement)
     * RESTAURÉ depuis index_originel.html
     * @param {number} regId - ID de l'inscription
     * @returns {Promise<{data, error}>}
     */
    async deleteRegistration(regId) {
        try {
            const { data, error } = await supabase
                .from('registrations')
                .delete()
                .eq('id', regId)
                .select()
                .single();

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erreur suppression inscription:', error);
            return { data: null, error };
        }
    },

    /**
     * Inscrit manuellement un participant à un créneau (admin)
     * Si 'force' est true, augmente la capacité du créneau si nécessaire.
     * @param {number} shiftId - ID du créneau
     * @param {string} userId - ID de l'utilisateur
     * @param {boolean} force - Forcer l'ajout même si complet
     * @returns {Promise<{data, error, needsConfirmation}>}
     */
    async addParticipant(shiftId, userId, force = false) {
        try {
            // 1. Vérifie si déjà inscrit
            const { data: existing } = await supabase
                .from('registrations')
                .select('id')
                .eq('shift_id', shiftId)
                .eq('user_id', userId)
                .single();

            if (existing) {
                return { data: null, error: { message: 'Participant déjà inscrit à ce créneau' } };
            }

            // 2. Vérifie la capacité
            const { data: shift } = await supabase
                .from('shifts')
                .select('max_slots')
                .eq('id', shiftId)
                .single();

            const { count } = await supabase
                .from('registrations')
                .select('*', { count: 'exact', head: true })
                .eq('shift_id', shiftId);

            if (shift && count >= shift.max_slots) {
                if (!force) {
                    return { data: null, error: null, needsConfirmation: true };
                } else {
                    // Augmente la capacité pour permettre l'ajout
                    await supabase
                        .from('shifts')
                        .update({ max_slots: count + 1 })
                        .eq('id', shiftId);
                }
            }

            // 3. Inscrit le participant
            const { data, error } = await supabase
                .from('registrations')
                .insert({
                    shift_id: shiftId,
                    user_id: userId,
                    attended: false
                })
                .select(`
                    *,
                    profiles (
                        first_name,
                        last_name,
                        phone,
                        email
                    )
                `)
                .single();

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erreur ajout participant:', error);
            return { data: null, error };
        }
    },

    /**
     * Récupère les statistiques de participation pour un événement
     * NOUVEAU - Amélioration
     * @param {number} eventId - ID de l'événement
     * @returns {Promise<{data, error}>}
     */
    async getEventStats(eventId) {
        try {
            const { data: registrations, error } = await this.getEventRegistrations(eventId);

            if (error) throw error;

            const stats = {
                total: registrations?.length || 0,
                attended: registrations?.filter(r => r.attended).length || 0,
                pending: registrations?.filter(r => !r.attended).length || 0,
                attendanceRate: 0
            };

            if (stats.total > 0) {
                stats.attendanceRate = Math.round((stats.attended / stats.total) * 100);
            }

            return { data: stats, error: null };
        } catch (error) {
            console.error('❌ Erreur calcul statistiques:', error);
            return { data: null, error };
        }
    },

    /**
     * Exporte la liste des participants au format CSV
     * NOUVEAU - Fonctionnalité utile pour admin
     * @param {number} shiftId - ID du créneau
     * @returns {Promise<{data, error}>}
     */
    async exportParticipantsCSV(shiftId) {
        try {
            const { data: registrations, error } = await this.getShiftRegistrations(shiftId);

            if (error) throw error;

            // Génère le CSV
            const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Présent', 'Date inscription'];
            const rows = registrations.map(reg => [
                reg.profiles.first_name,
                reg.profiles.last_name,
                reg.profiles.email,
                reg.profiles.phone || 'N/A',
                reg.attended ? 'Oui' : 'Non',
                new Date(reg.created_at).toLocaleDateString('fr-FR')
            ]);

            const csv = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            return { data: csv, error: null };
        } catch (error) {
            console.error('❌ Erreur export CSV:', error);
            return { data: null, error };
        }
    },

    /**
     * Vérifie si un créneau est complet
     * @param {number} shiftId - ID du créneau
     * @returns {Promise<{isFull: boolean, current: number, max: number}>}
     */
    async checkShiftCapacity(shiftId) {
        try {
            // Récupère le créneau
            const { data: shift, error: shiftError } = await supabase
                .from('shifts')
                .select('max_slots')
                .eq('id', shiftId)
                .single();

            if (shiftError) throw shiftError;

            // Compte les inscriptions
            const { count, error: countError } = await supabase
                .from('registrations')
                .select('*', { count: 'exact', head: true })
                .eq('shift_id', shiftId);

            if (countError) throw countError;

            return {
                isFull: count >= shift.max_slots,
                current: count,
                max: shift.max_slots
            };
        } catch (error) {
            console.error('❌ Erreur vérification capacité:', error);
            return { isFull: false, current: 0, max: 0 };
        }
    },

    /**
     * Force la validation des heures pour une inscription (Admin Override)
     * Utile pour les bénévoles "Hors Quota"
     * @param {number} regId - ID de l'inscription
     * @param {boolean} shouldCount - Force à TRUE ou FALSE
     */
    async forceHoursValidation(regId, shouldCount) {
        try {
            // 1. Update counts_for_hours
            const { data: reg, error } = await supabase
                .from('registrations')
                .update({ counts_for_hours: shouldCount })
                .eq('id', regId)
                .select('*, shifts(*)')
                .single();

            if (error) throw error;

            // 2. If attended, recalculate hours immediately
            if (reg.attended) {
                // Trigger logic similar to the DB trigger but manual to be sure
                const shift = reg.shifts;
                let newHoursCounted = 0;

                if (shouldCount) {
                    const start = new Date(`${'1970-01-01'}T${shift.start_time}`); // Date part doesn't matter for duration
                    const end = new Date(`${'1970-01-01'}T${shift.end_time}`);
                    newHoursCounted = (end - start) / (1000 * 60 * 60);
                    newHoursCounted = Math.max(0, newHoursCounted);
                }

                // Update hours_counted
                await supabase
                    .from('registrations')
                    .update({ hours_counted: newHoursCounted })
                    .eq('id', regId);

                // 3. Trigger Profile Total Update (recalc all for this user to be safe)
                // We can use the simple ADD/SUBTRACT logic DB side or re-sum.
                // Re-sum is safer.
                const { data: allRegs } = await supabase
                    .from('registrations')
                    .select('hours_counted')
                    .eq('user_id', reg.user_id)
                    .not('hours_counted', 'is', null);

                const total = (allRegs || []).reduce((acc, r) => acc + (Number(r.hours_counted) || 0), 0);

                await supabase
                    .from('profiles')
                    .update({ total_hours: total })
                    .eq('id', reg.user_id);
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Erreur forçage validation:', error);
            return { success: false, error };
        }
    }
};
