
import { supabase } from '../../services/supabase.js';

export const PlanningService = {
    // Récupérer les événements (Futurs ou Passés)
    async getAllEventsAdmin(filter = 'upcoming') {
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
        if (error) return { error };

        return { data };
    },

    // Récupérer un événement spécifique (pour l'édition)
    async getEventById(id) {
        const { data, error } = await supabase
            .from('events')
            .select('*, shifts(*)')
            .eq('id', id)
            .single();

        if (error) return { error };
        return { data };
    },

    // Créer un événement et ses créneaux
    async createEvent(eventData, shiftsData) {
        // 1. Créer l'événement
        const { data: evt, error: evtError } = await supabase
            .from('events')
            .insert([eventData])
            .select()
            .single();

        if (evtError) return { error: evtError };

        // 2. Préparer et créer les créneaux
        if (shiftsData && shiftsData.length > 0) {
            const shifts = shiftsData.map(s => ({
                event_id: evt.id,
                title: s.title,
                start_time: s.start_time,
                end_time: s.end_time,
                max_slots: s.max_slots || 10,
                reserved_slots: s.reserved_slots || 0,
                referent_name: s.referent_name,
                hours_value: s.hours_value
            }));

            const { error: shiftError } = await supabase.from('shifts').insert(shifts);
            if (shiftError) return { error: shiftError };
        }

        return { data: evt };
    },

    // Mettre à jour un événement (infos de base)
    async updateEvent(id, eventData) {
        const { data, error } = await supabase
            .from('events')
            .update(eventData)
            .eq('id', id)
            .select()
            .single();

        if (error) return { error };
        return { data };
    },

    // Supprimer un événement et tout ce qui est lié (Cascade handled by DB usually, but manual check implied in orig)
    async deleteEvent(id) {
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) return { error };
        return { success: true };
    },

    // Supprimer un créneau spécifique
    async deleteShift(id) {
        // Supprimer d'abord les inscriptions (sécurité si pas de cascade)
        await supabase.from('registrations').delete().eq('shift_id', id);

        const { error } = await supabase.from('shifts').delete().eq('id', id);
        if (error) return { error };
        return { success: true };
    },

    // Mettre à jour un créneau
    async updateShift(id, shiftData) {
        const { error } = await supabase
            .from('shifts')
            .update(shiftData)
            .eq('id', id);

        if (error) return { error };
        return { success: true };
    },

    // Créer un créneau individuel (utile pour l'édition d'événements)
    async createShift(shiftData) {
        const { error } = await supabase.from('shifts').insert([shiftData]);
        if (error) return { error };
        return { success: true };
    },

    // --- TEMPLATES ---
    async getTemplates() {
        const { data, error } = await supabase.from('event_templates').select('*');
        if (error) return { error };
        return { data };
    },

    async createTemplate(templateData) {
        // templateData: { name, event_title, event_location, shifts_config: [] }
        const { data, error } = await supabase
            .from('event_templates')
            .insert([templateData])
            .select()
            .single();

        if (error) return { error };
        return { data };
    },

    async deleteTemplate(id) {
        const { error } = await supabase.from('event_templates').delete().eq('id', id);
        if (error) return { error };
        return { success: true };
    }
};
