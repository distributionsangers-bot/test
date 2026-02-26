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
import { requireAdmin } from '../../services/auth-guard.js';

export const PlanningService = {
    /**
     * Récupère tous les événements (futurs ou passés)
     * RESTAURÉ depuis index_originel.html (lignes 1302-1350)
     * @param {string} filter - 'upcoming' ou 'history'
     * @returns {Promise<{data, error}>}
     */
    async getAllEventsAdmin(filter = 'upcoming') {
        try {
            let query = supabase
                .from('events')
                .select('*, shifts(*)') // OPTIMIZATION: Removed registrations(count) to rely on shifts.total_registrations
                .order('date', { ascending: filter === 'upcoming' });

            // OPTIMIZATION: Filter at DB level but include "today" in BOTH queries 
            // because "today" can contain both passed and future events depending on time.
            const d = new Date();
            const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            if (filter === 'upcoming') {
                query = query.gte('date', today);
            } else {
                query = query.lte('date', today);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (data) {
                const now = new Date();

                // 1. Sort shifts by time for each event and compute event end datetime
                data.forEach(event => {
                    if (event.shifts && event.shifts.length > 0) {
                        event.shifts.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
                        // Attach earliest time for sorting
                        event._earliest_shift = event.shifts[0].start_time || '00:00';
                        // Compute the latest shift end_time for this event
                        const latestEnd = event.shifts.reduce((latest, s) => {
                            return (s.end_time || '') > latest ? s.end_time : latest;
                        }, '');
                        // Combine event date + latest shift end_time into a full datetime
                        if (latestEnd) {
                            event._end_datetime = new Date(`${event.date}T${latestEnd}`);
                        } else {
                            // Fallback: end of day if no end_time
                            event._end_datetime = new Date(`${event.date}T23:59:59`);
                        }
                    } else {
                        event._earliest_shift = '00:00';
                        // No shifts: use end of day
                        event._end_datetime = new Date(`${event.date}T23:59:59`);
                    }
                });

                // 2. Filter: upcoming = last shift end_time NOT yet passed; history = passed
                const filtered = data.filter(event => {
                    const isPast = event._end_datetime <= now;
                    return filter === 'upcoming' ? !isPast : isPast;
                });

                // 3. Sort events by Date THEN by Time
                filtered.sort((a, b) => {
                    // Primary: Date
                    const dateA = new Date(a.date).getTime();
                    const dateB = new Date(b.date).getTime();
                    if (dateA !== dateB) {
                        return filter === 'upcoming' ? dateA - dateB : dateB - dateA;
                    }

                    // Secondary: Time (Earliest shift)
                    if (filter === 'upcoming') {
                        return a._earliest_shift.localeCompare(b._earliest_shift);
                    } else {
                        return b._earliest_shift.localeCompare(a._earliest_shift);
                    }
                });

                return { data: filtered, error: null };
            }

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erreur récupération événements:', error);
            return { data: null, error };
        }
    },

    /**
     * Récupère les événements passés avec pagination et recherche
     * @param {number} page - Numéro de page (1-indexed)
     * @param {number} limit - Nombre d'éléments par page
     * @param {string} search - Terme de recherche
     * @returns {Promise<{data, count, error}>}
     */
    async getHistoryEvents(page = 1, limit = 10, search = '') {
        try {
            // Fetch slightly more to account for filtering today's future events
            // We'll slice the result after filtering
            const buffer = 5;
            const from = (page - 1) * limit;
            const to = from + limit + buffer - 1;

            const _d = new Date();
            const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
            const now = new Date();

            let query = supabase
                .from('events')
                .select('*, shifts(*)', { count: 'exact' })
                .lte('date', today)
                .order('date', { ascending: false });

            // Recherche (Titre OU Lieu)
            if (search) {
                query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%`);
            }

            // Pagination
            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw error;

            let filteredConfigured = [];

            if (data) {
                // 1. Configure helpers (end_datetime)
                data.forEach(event => {
                    if (event.shifts && event.shifts.length > 0) {
                        event.shifts.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
                        event._earliest_shift = event.shifts[0].start_time || '00:00';

                        // Compute latest end time
                        const latestEnd = event.shifts.reduce((latest, s) => {
                            return (s.end_time || '') > latest ? s.end_time : latest;
                        }, '');

                        if (latestEnd) {
                            event._end_datetime = new Date(`${event.date}T${latestEnd}`);
                        } else {
                            event._end_datetime = new Date(`${event.date}T23:59:59`);
                        }
                    } else {
                        event._earliest_shift = '00:00';
                        event._end_datetime = new Date(`${event.date}T23:59:59`);
                    }
                });

                // 2. Filter: History = strictly past events
                // If event is TODAY and end_time > now => it's UPCOMING (not history)
                filteredConfigured = data.filter(event => {
                    return event._end_datetime <= now;
                });
            }

            // 3. Slice to respect limit (since we asked for buffer)
            const finalData = filteredConfigured.slice(0, limit);

            return { data: finalData, count, error: null };
        } catch (error) {
            console.error('❌ Erreur récupération historique:', error);
            return { data: null, count: 0, error };
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
        const guard = requireAdmin('créer un événement');
        if (guard) return guard;
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
        const guard = requireAdmin('modifier un événement');
        if (guard) return guard;
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
        const guard = requireAdmin('supprimer un événement');
        if (guard) return guard;
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
        const guard = requireAdmin('supprimer un créneau');
        if (guard) return guard;
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
        const guard = requireAdmin('modifier un créneau');
        if (guard) return guard;
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
        const guard = requireAdmin('créer un créneau');
        if (guard) return guard;
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
        const guard = requireAdmin('créer un modèle');
        if (guard) return guard;
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
        const guard = requireAdmin('supprimer un modèle');
        if (guard) return guard;
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

    async updateTemplate(id, templateData) {
        const guard = requireAdmin('modifier un modèle');
        if (guard) return guard;
        try {
            const { data, error } = await supabase
                .from('event_templates')
                .update(templateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erreur mise à jour template:', error);
            return { data: null, error };
        }
    },

    /**
     * Récupère les statistiques du planning
     * NOUVEAU - Fonctionnalité utile pour dashboard
     * @returns {Promise<{data, error}>}
     */
    async getPlanningStats() {
        try {
            const _d = new Date();
            const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;

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
