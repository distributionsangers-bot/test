/**
 * ============================================
 * NOTIFICATION BADGE SERVICE
 * ============================================
 * Service centralisé pour gérer les badges de notification
 * sur les navbars (sidebar desktop + mobile nav).
 * 
 * Badges :
 * - Messages : conversations non lues (tout le monde)
 * - Annuaire : bénévoles en attente (admin)
 * - Planning : événements à venir (admin)
 * - Pôles : intéressés bénévoles (admin)
 * - Missions : missions disponibles (bénévole)
 * 
 * Utilise Supabase Realtime pour des mises à jour
 * DOM ciblées sans re-render de la page.
 * ============================================
 */

import { supabase } from './supabase.js';
import { store } from '../core/store.js';

let realtimeChannels = [];

/**
 * Initialise les badges : fetch initial + subscriptions realtime
 */
export async function initBadges() {
    // Cleanup any existing subscriptions
    cleanupBadges();

    // Initial fetch of all counts
    await refreshAllBadges();

    // Setup realtime subscriptions
    setupRealtimeSubscriptions();
}

/**
 * Rafraîchit tous les compteurs de badges
 */
export async function refreshAllBadges() {
    const isAdmin = store.state.profile?.is_admin && store.state.adminMode;

    // Parallel fetch of all badge counts
    const promises = [fetchUnreadMessages()];

    if (isAdmin) {
        promises.push(fetchPendingVolunteers());
        promises.push(fetchUpcomingEvents());
        promises.push(fetchPoleInterests());
    } else {
        promises.push(fetchAvailableMissions());
    }

    await Promise.all(promises);
}

/**
 * Configure les subscriptions Supabase Realtime
 */
function setupRealtimeSubscriptions() {
    const isAdmin = store.state.profile?.is_admin && store.state.adminMode;

    // 1. Messages realtime — écoute les nouveaux messages
    const messagesChannel = supabase.channel('badges-messages')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'messages' },
            () => fetchUnreadMessages()
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'tickets' },
            () => fetchUnreadMessages()
        )
        .subscribe();
    realtimeChannels.push(messagesChannel);

    if (isAdmin) {
        // 2. Profiles realtime — bénévoles en attente
        const profilesChannel = supabase.channel('badges-profiles')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                () => fetchPendingVolunteers()
            )
            .subscribe();
        realtimeChannels.push(profilesChannel);

        // 3. Events realtime — événements à venir
        const eventsChannel = supabase.channel('badges-events')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'events' },
                () => fetchUpcomingEvents()
            )
            .subscribe();
        realtimeChannels.push(eventsChannel);
    } else {
        // 4. Missions realtime for volunteers — events + shifts changes
        const missionsChannel = supabase.channel('badges-missions')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'events' },
                () => fetchAvailableMissions()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shifts' },
                () => fetchAvailableMissions()
            )
            .subscribe();
        realtimeChannels.push(missionsChannel);
    }

    // Pole interests realtime (admin only)
    if (isAdmin) {
        const polesChannel = supabase.channel('badges-poles')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'pole_interests' },
                () => fetchPoleInterests()
            )
            .subscribe();
        realtimeChannels.push(polesChannel);
    }
}

// =========================================================================
// FETCH FUNCTIONS — Chaque fonction récupère un compteur et met à jour le DOM
// =========================================================================

/**
 * Messages non lus
 */
async function fetchUnreadMessages() {
    try {
        const isAdmin = store.state.profile?.is_admin && store.state.adminMode;
        const myId = store.state.user?.id;
        if (!myId) return;

        let query = supabase
            .from('tickets')
            .select('id, last_message_at, admin_last_read_at, volunteer_last_read_at, user_id, assigned_admin_id, category, status, hidden_for_admin, hidden_for_volunteer, messages(created_at, user_id, deleted_at)')
            .neq('status', 'deleted')
            .order('last_message_at', { ascending: false });

        if (isAdmin) {
            query = query.not('hidden_for_admin', 'is', true)
                .or(`assigned_admin_id.eq.${myId},assigned_admin_id.is.null`);
        } else {
            query = query.not('hidden_for_volunteer', 'is', true)
                .or(`user_id.eq.${myId},category.eq.announcement`);
        }

        const { data, error } = await query;
        if (error) { console.error('Badge: fetchUnreadMessages error', error); return; }

        let unreadCount = 0;
        data?.forEach(ticket => {
            const myLastRead = isAdmin ? ticket.admin_last_read_at : ticket.volunteer_last_read_at;
            const myLastReadDate = myLastRead ? new Date(myLastRead) : new Date(0);

            // Check if any non-deleted message is newer than last read and not from me
            const msgs = ticket.messages || [];
            const hasUnread = msgs.some(m =>
                !m.deleted_at &&
                new Date(m.created_at) > myLastReadDate &&
                m.user_id !== myId
            );
            if (hasUnread) unreadCount++;
        });

        updateBadgeDOM('messages', unreadCount);
    } catch (err) {
        console.error('Badge: fetchUnreadMessages error', err);
    }
}

/**
 * Bénévoles en attente de validation (admin)
 */
async function fetchPendingVolunteers() {
    try {
        const { count, error } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (error) { console.error('Badge: fetchPendingVolunteers error', error); return; }
        updateBadgeDOM('pending', count || 0);
    } catch (err) {
        console.error('Badge: fetchPendingVolunteers error', err);
    }
}

/**
 * Événements à venir (admin — Planning)
 */
async function fetchUpcomingEvents() {
    try {
        const _d = new Date();
        const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;

        // 1. Count future events (tomorrow+)
        const { count: futureCount, error: futureError } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .gt('date', today);

        if (futureError) throw futureError;

        // 2. Fetch today's events with shifts to check time
        const { data: todayEvents, error: todayError } = await supabase
            .from('events')
            .select('date, shifts(end_time)')
            .eq('date', today);

        if (todayError) throw todayError;

        // Filter today's events: active if at least one shift is not passed
        const now = new Date();
        const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const activeTodayCount = todayEvents?.filter(e => {
            if (!e.shifts || e.shifts.length === 0) return true; // Keep if no shifts (safe default)
            // Check if any shift ends after now
            return e.shifts.some(s => (s.end_time || '23:59') >= timeStr);
        }).length || 0;

        const total = (futureCount || 0) + activeTodayCount;
        updateBadgeDOM('planning', total);
    } catch (err) {
        console.error('Badge: fetchUpcomingEvents error', err);
    }
}

/**
 * Missions disponibles (bénévole — Missions)
 */
async function fetchAvailableMissions() {
    try {
        const _d = new Date();
        const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
        const now = new Date();

        const { data, error } = await supabase
            .from('events')
            .select('id, date, publish_at, shifts(end_time)')
            .gte('date', today)
            .eq('is_visible', true);

        if (error) { console.error('Badge: fetchAvailableMissions error', error); return; }

        const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const count = data?.filter(e => {
            // 1. Check publish_at (scheduled)
            if (e.publish_at && new Date(e.publish_at) > now) return false;

            // 2. Check time if today
            if (e.date === today) {
                if (!e.shifts || e.shifts.length === 0) return true;
                return e.shifts.some(s => (s.end_time || '23:59') >= timeStr);
            }

            return true; // Future dates are kept
        }).length || 0;

        updateBadgeDOM('missions', count);
    } catch (err) {
        console.error('Badge: fetchAvailableMissions error', err);
    }
}

/**
 * Intéressés pôles (admin — Pôles)
 */
async function fetchPoleInterests() {
    try {
        const { data, error } = await supabase
            .from('pole_interests')
            .select('team_id');

        if (error) { console.error('Badge: fetchPoleInterests error', error); return; }
        updateBadgeDOM('poles', data?.length || 0);
    } catch (err) {
        console.error('Badge: fetchPoleInterests error', err);
    }
}

// =========================================================================
// DOM UPDATE — Met à jour les éléments badge dans le DOM
// =========================================================================

/**
 * Met à jour les badges dans le DOM (sidebar + mobile nav)
 * @param {string} type - 'messages' | 'pending' | 'planning' | 'missions'
 * @param {number} count - Le compteur à afficher
 */
function updateBadgeDOM(type, count) {
    const ids = [
        `sidebar-badge-${type}`,
        `mobile-badge-${type}`
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        if (count > 0) {
            el.textContent = count > 99 ? '99+' : count;
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
}

/**
 * Nettoie toutes les subscriptions realtime
 */
export function cleanupBadges() {
    realtimeChannels.forEach(ch => {
        try { supabase.removeChannel(ch); } catch (e) { /* ignore */ }
    });
    realtimeChannels = [];
}
