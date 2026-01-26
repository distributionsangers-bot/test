/**
 * ============================================
 * PLANNING SERVICE
 * ============================================
 * Gère le planning des événements (admin) :
 * - CRUD événements
 * - CRUD créneaux (shifts)
 * - Templates d'événements
 * - Statistiques
 * 
 * RESTAURÉ depuis index_originel.html (renderPlanningAdmin)
 * ============================================
 */

import { supabase } from '../../services/supabase.js';

export const PlanningService = {
    /**
     * Récupère tous les événements (futurs ou passés)
     * RESTAURÉ depuis index_originel.html (lignes 1302-1350)
     * @param {string} filter - 'upcoming' ou 'history'
     * @returns {Promise<{data, error}>}
     */
    async getAllEventsAdmin(filter = 'upcoming') {
        try {
            const today = new Date().toISOString().split('T')[0];

            let query = supabase
                .from('events')
                .select('*, shifts(*, registrations(count))')
                .order('date', { ascending: filter === 'upcoming' });

            if (filter === 'upcoming') {
                query = query.gte('date', today);
            } else {
                query = query.lt('date', today);
            }

            const { data, error } = await query;

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erreur récupération événements:', error);
            return { data: null, error };
        }
    },

    /**
     * Récupère un événement spécifique avec ses créneaux
     * @param {number} id - ID de l'événement
     * @returns {Promise<{data, error}>}
     */
    async getEventById(id) {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*, shifts(*)')
                .eq('id', id)
                .single();

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erreur récupération événement:', error);
            return { data: null, error };
        }
    },

    /**
     * Crée un événement et ses créneaux
     * RESTAURÉ depuis index_originel.html (création événement)
     * @param {Object} eventData - Données de l'événement
     * @param {Array} shiftsData - Tableau des créneaux
     * @returns {Promise<{data, error}>}
     */
    async createEvent(eventData, shiftsData) {
        try {
            // 1. Crée l'événement
            const { data: evt, error: evtError } = await supabase
                .from('events')
                .insert([eventData])
                .select()
                .single();

            if (evtError) throw evtError;

            // 2. Crée les créneaux si fournis
            if (shiftsData && shiftsData.length > 0) {
                const shifts = shiftsData.map(s => ({
                    event_id: evt.id,
                    title: s.title,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    max_slots: s.max_slots || 10,
                    reserved_slots: s.reserved_slots || 0,
                    referent_name: s.referent_name || null,
                    hours_value: s.hours_value || 0
                }));

                const { error: shiftError } = await supabase
                    .from('shifts')
                    .insert(shifts);

                if (shiftError) throw shiftError;
            }

            return { data: evt, error: null };
        } catch (error) {
            console.error('❌ Erreur création événement:', error);
            return { data: null, error };
        }
    },

    /**
     * Met à jour un événement (infos de base uniquement)
     * @param {number} id - ID de l'événement
     * @param {Object} eventData - Données à mettre à jour
     * @returns {Promise<{data, error}>}
     */
    async updateEvent(id, eventData) {
        try {
            const { data, error } = await supabase
                .from('events')
                .update(eventData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erreur mise à jour événement:', error);
            return { data: null, error };
        }
    },

    /**
     * Supprime un événement et tous ses créneaux (CASCADE)
     * RESTAURÉ depuis index_originel.html
     * @param {number} id - ID de l'événement
     * @returns {Promise<{success, error}>}
     */
    async deleteEvent(id) {
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Erreur suppression événement:', error);
            return { success: false, error };
        }
    },

    /**
     * Supprime un créneau spécifique
     * RESTAURÉ depuis index_originel.html (lignes 1358-1383)
     * @param {number} id - ID du créneau
     * @returns {Promise<{success, error}>}
     */
    async deleteShift(id) {
        try {
            // Supprime d'abord les inscriptions (sécurité si pas de CASCADE)
            await supabase
                .from('registrations')
                .delete()
                .eq('shift_id', id);

            // Supprime le créneau
            const { error } = await supabase
                .from('shifts')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Erreur suppression créneau:', error);
            return { success: false, error };
        }
    },

    /**
     * Met à jour un créneau
     * RESTAURÉ depuis index_originel.html (lignes 1419-1440)
     * @param {number} id - ID du créneau
     * @param {Object} shiftData - Données à mettre à jour
     * @returns {Promise<{success, error}>}
     */
    async updateShift(id, shiftData) {
        try {
            const { error } = await supabase
                .from('shifts')
                .update(shiftData)
                .eq('id', id);

            if (error) throw error;

            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Erreur mise à jour créneau:', error);
            return { success: false, error };
        }
    },

    /**
     * Crée un créneau individuel
     * @param {Object} shiftData - Données du créneau
     * @returns {Promise<{success, error}>}
     */
    async createShift(shiftData) {
        try {
            const { error } = await supabase
                .from('shifts')
                .insert([shiftData]);

            if (error) throw error;

            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Erreur création créneau:', error);
            return { success: false, error };
        }
    },

    /**
     * Récupère tous les templates d'événements
     * RESTAURÉ depuis index_originel.html (templates)
     * @returns {Promise<{data, error}>}
     */
    async getTemplates() {
        try {
            const { data, error } = await supabase
                .from('event_templates')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erreur récupération templates:', error);
            return { data: null, error };
        }
    },

    /**
     * Crée un template d'événement
     * @param {Object} templateData - { name, event_title, event_location, shifts_config }
     * @returns {Promise<{data, error}>}
     */
    async createTemplate(templateData) {
        try {
            const { data, error } = await supabase
                .from('event_templates')
                .insert([templateData])
                .select()
                .single();

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erreur création template:', error);
            return { data: null, error };
        }
    },

    /**
     * Supprime un template
     * @param {number} id - ID du template
     * @returns {Promise<{success, error}>}
     */
    async deleteTemplate(id) {
        try {
            const { error } = await supabase
                .from('event_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Erreur suppression template:', error);
            return { success: false, error };
        }
    },

    /**
     * Récupère les statistiques du planning
     * NOUVEAU - Fonctionnalité utile pour dashboard
     * @returns {Promise<{data, error}>}
     */
    async getPlanningStats() {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Événements à venir
            const { data: upcoming, error: upcomingError } = await supabase
                .from('events')
                .select('id')
                .gte('date', today);

            if (upcomingError) throw upcomingError;

            // Événements passés
            const { data: past, error: pastError } = await supabase
                .from('events')
                .select('id')
                .lt('date', today);

            if (pastError) throw pastError;

            // Créneaux avec places disponibles (urgences)
            const { data: shifts, error: shiftsError } = await supabase
                .from('shifts')
                .select('id, max_slots, event_id, events!inner(date)')
                .gte('events.date', today);

            if (shiftsError) throw shiftsError;

            // Compte les inscriptions par créneau
            let urgentShifts = 0;
            for (const shift of shifts) {
                const { count } = await supabase
                    .from('registrations')
                    .select('*', { count: 'exact', head: true })
                    .eq('shift_id', shift.id);

                if (count < shift.max_slots) {
                    urgentShifts++;
                }
            }

            const stats = {
                upcomingEvents: upcoming?.length || 0,
                pastEvents: past?.length || 0,
                urgentShifts
            };

            return { data: stats, error: null };
        } catch (error) {
            console.error('❌ Erreur récupération statistiques planning:', error);
            return { data: null, error };
        }
    },

    // =========================================================================
    // 📡 REALTIME SUBSCRIPTIONS
    // =========================================================================

    /**
     * S'abonne aux changements des inscriptions (registrations) en temps réel
     * Permet de mettre à jour dynamiquement le nombre de places disponibles
     * @param {Function} callback - Fonction appelée quand il y a un changement
     * @returns {Object} - { unsubscribe } pour arrêter l'écoute
     */
    subscribeToRegistrations(callback) {
        const channel = supabase.channel('global-registrations-listener')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'registrations' },
                (payload) => {
                    // On appelle la callback avec le payload complet
                    // event sera 'INSERT', 'UPDATE' ou 'DELETE'
                    callback(payload);
                }
            )
            .subscribe();

        return {
            unsubscribe: () => supabase.removeChannel(channel)
        };
    }
};
