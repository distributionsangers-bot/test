import { EventsService } from './events.service.js';
import { supabase } from '../../services/supabase.js';
import { store } from '../../core/store.js';
import { showToast, toggleLoader, escapeHtml } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';

let abortController = null;
let currentFilter = 'all'; // 'all' or 'mine'

export async function renderEvents() {
    toggleLoader(true);
    try {
        const userId = store.state.user?.id;

        const { data: shifts, error } = await supabase
            .from('shifts')
            .select(`
                *,
                events!inner ( id, title, date, location, is_visible, publish_at ),
                registrations ( user_id )
            `)
            .gte('events.date', new Date().toISOString().split('T')[0])
            .order('start_time', { ascending: true });

        if (error) throw error;

        // Filter out hidden events
        const now = new Date();
        const visibleShifts = shifts.filter(shift => {
            if (!shift.events) return false;
            const isVisible = shift.events.is_visible !== false;
            const isScheduledForFuture = shift.events.publish_at && new Date(shift.events.publish_at) > now;
            return isVisible && !isScheduledForFuture;
        });

        // Sort by event date
        visibleShifts.sort((a, b) => new Date(a.events.date) - new Date(b.events.date));

        // Group by event
        const eventGroups = {};
        visibleShifts.forEach(shift => {
            const eventId = shift.events.id;
            if (!eventGroups[eventId]) {
                eventGroups[eventId] = {
                    event: shift.events,
                    shifts: []
                };
            }
            eventGroups[eventId].shifts.push(shift);
        });

        // Calculate stats
        const myRegistrations = visibleShifts.filter(s =>
            s.registrations.some(r => r.user_id === userId)
        );
        const totalMissions = Object.keys(eventGroups).length;
        const myMissionsCount = myRegistrations.length;

        // Find next mission
        let nextMission = null;
        if (myRegistrations.length > 0) {
            nextMission = myRegistrations[0];
        }

        // Render events HTML
        const eventsHtml = Object.values(eventGroups)
            .filter(group => {
                if (currentFilter === 'mine') {
                    return group.shifts.some(s => s.registrations.some(r => r.user_id === userId));
                }
                return true;
            })
            .map(group => renderEventGroup(group, userId))
            .join('');

        return `
            <div id="events-view-container" class="animate-fade-in pb-24 max-w-3xl mx-auto">
                
                <!-- PREMIUM HEADER -->
                <div class="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-6 mb-6 shadow-2xl shadow-emerald-500/20">
                    <div class="absolute inset-0 opacity-10" style="background-image: url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"1\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
                    
                    <div class="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="text-white">
                            <h1 class="text-2xl font-black tracking-tight flex items-center gap-2">
                                <i data-lucide="calendar-check" class="w-7 h-7"></i>
                                Missions
                            </h1>
                            <p class="text-white/70 text-sm font-medium mt-1">Rejoignez les prochaines distributions</p>
                        </div>
                        
                        <!-- Stats & Scanner -->
                        <div class="flex items-center gap-3">
                            <div class="flex gap-2">
                                <div class="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 text-center border border-white/20">
                                    <div class="text-xl font-black text-white">${totalMissions}</div>
                                    <div class="text-[9px] font-bold text-white/60 uppercase">À venir</div>
                                </div>
                                <div class="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 text-center border border-white/20">
                                    <div class="text-xl font-black text-amber-300">${myMissionsCount}</div>
                                    <div class="text-[9px] font-bold text-white/60 uppercase">Inscrit</div>
                                </div>
                            </div>
                            <button id="btn-scan-qr" class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white hover:bg-white/30 transition border border-white/30">
                                <i data-lucide="scan-line" class="w-6 h-6"></i>
                            </button>
                        </div>
                    </div>

                    ${nextMission ? renderNextMissionBanner(nextMission) : ''}
                </div>

                <!-- FILTERS -->
                <div class="flex gap-2 mb-6">
                    <button data-filter="all" class="filter-btn ${currentFilter === 'all' ? 'active bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100'} px-4 py-2.5 rounded-xl text-sm font-bold transition">
                        📅 Toutes <span class="opacity-60">(${totalMissions})</span>
                    </button>
                    <button data-filter="mine" class="filter-btn ${currentFilter === 'mine' ? 'active bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100'} px-4 py-2.5 rounded-xl text-sm font-bold transition">
                        ✓ Mes inscriptions <span class="opacity-60">(${myMissionsCount})</span>
                    </button>
                </div>

                <!-- EVENTS LIST -->
                <div id="events-list" class="space-y-4">
                    ${eventsHtml || renderEmptyState()}
                </div>
            </div>
        `;

    } catch (err) {
        console.error(err);
        return `
            <div class="p-10 text-center">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="alert-circle" class="w-8 h-8 text-red-400"></i>
                </div>
                <p class="text-red-500 font-bold">Erreur de chargement</p>
            </div>
        `;
    } finally {
        toggleLoader(false);
    }
}

function renderNextMissionBanner(shift) {
    const date = new Date(shift.events.date);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

    let urgencyText = '';
    let urgencyClass = '';
    if (diffDays <= 0) {
        urgencyText = "🔥 Aujourd'hui !";
        urgencyClass = 'bg-red-500/20 border-red-500/30 text-red-200';
    } else if (diffDays === 1) {
        urgencyText = "⏰ Demain !";
        urgencyClass = 'bg-amber-500/20 border-amber-500/30 text-amber-200';
    } else if (diffDays <= 2) {
        urgencyText = `⚡ Dans ${diffDays} jours`;
        urgencyClass = 'bg-amber-500/20 border-amber-500/30 text-amber-200';
    } else {
        return '';
    }

    return `
        <div class="mt-4 p-3 rounded-xl ${urgencyClass} border backdrop-blur-sm flex items-center gap-3">
            <span class="text-sm font-bold">${urgencyText}</span>
            <span class="text-xs opacity-80">${escapeHtml(shift.events.title)} - ${(shift.start_time || '').slice(0, 5)}</span>
        </div>
    `;
}

function renderEventGroup(group, userId) {
    const { event, shifts } = group;
    const date = new Date(event.date);
    const dayNum = date.getDate();
    const monthStr = date.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
    const dayStr = date.toLocaleDateString('fr-FR', { weekday: 'long' });

    // Check if any shift is registered
    const hasRegistration = shifts.some(s => s.registrations.some(r => r.user_id === userId));

    // Check if soon (within 48h)
    const now = new Date();
    const diffHours = (date - now) / (1000 * 60 * 60);
    const isSoon = diffHours <= 48 && diffHours > 0;

    const shiftsHtml = shifts.map(s => renderShiftCard(s, userId)).join('');

    return `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${hasRegistration ? 'ring-2 ring-emerald-400' : ''}">
            <!-- Event Header -->
            <div class="p-4 flex gap-4 border-b border-slate-100 bg-slate-50/50">
                <!-- Date Block -->
                <div class="w-14 h-16 bg-gradient-to-br ${hasRegistration ? 'from-emerald-500 to-teal-600' : 'from-slate-700 to-slate-900'} rounded-xl flex flex-col items-center justify-center text-white shadow-lg flex-shrink-0">
                    <span class="text-xl font-black leading-none">${dayNum}</span>
                    <span class="text-[9px] font-bold opacity-80">${monthStr}</span>
                </div>

                <!-- Event Info -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap mb-1">
                        <span class="text-xs font-semibold text-slate-400 capitalize">${dayStr}</span>
                        ${isSoon ? '<span class="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">⚡ C\'est bientôt !</span>' : ''}
                        ${hasRegistration ? '<span class="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">✓ Inscrit</span>' : ''}
                    </div>
                    <h3 class="font-bold text-lg text-slate-900 truncate">${escapeHtml(event.title)}</h3>
                    <div class="flex items-center gap-1 text-xs text-slate-500 mt-1">
                        <i data-lucide="map-pin" class="w-3 h-3"></i>
                        ${escapeHtml(event.location)}
                    </div>
                </div>
            </div>

            <!-- Shifts -->
            <div class="p-3 space-y-2">
                ${shiftsHtml}
            </div>
        </div>
    `;
}

function renderShiftCard(shift, userId) {
    const isRegistered = shift.registrations.some(r => r.user_id === userId);
    const total = shift.max_slots || 0;
    const taken = shift.registrations.length;
    const remaining = total - taken;
    const isFull = remaining <= 0;
    const isAlmostFull = remaining <= 2 && remaining > 0;

    // Status badge
    let statusBadge = '';
    if (isFull) {
        statusBadge = '<span class="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg">Complet</span>';
    } else if (isAlmostFull) {
        statusBadge = `<span class="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">${remaining} place${remaining > 1 ? 's' : ''}</span>`;
    } else {
        statusBadge = `<span class="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">${remaining} places</span>`;
    }

    return `
        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3 ${isRegistered ? 'bg-emerald-50 border-emerald-200' : ''} hover:shadow-sm transition">
            <!-- Time -->
            <div class="text-center flex-shrink-0 w-16">
                <div class="text-sm font-bold ${isRegistered ? 'text-emerald-700' : 'text-slate-700'}">${(shift.start_time || '').slice(0, 5)}</div>
                <div class="text-[10px] text-slate-400">${(shift.end_time || '').slice(0, 5)}</div>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold text-sm ${isRegistered ? 'text-emerald-800' : 'text-slate-700'} truncate">${escapeHtml(shift.title)}</span>
                    ${statusBadge}
                </div>
                ${shift.referent_name ? `
                    <div class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <i data-lucide="user" class="w-3 h-3"></i>
                        Réf: ${escapeHtml(shift.referent_name)}
                    </div>
                ` : ''}
            </div>

            <!-- Action -->
            <button 
                data-action="toggle-reg" 
                data-shift-id="${shift.id}" 
                data-registered="${isRegistered}"
                ${isFull && !isRegistered ? 'disabled' : ''}
                class="px-4 py-2 rounded-xl text-sm font-bold transition flex-shrink-0 ${isRegistered
            ? 'bg-red-100 text-red-600 hover:bg-red-200 active:scale-95'
            : isFull
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 active:scale-95'
        }"
            >
                ${isRegistered ? 'Désister' : isFull ? 'Complet' : "S'inscrire"}
            </button>
        </div>
    `;
}

function renderEmptyState() {
    return `
        <div class="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i data-lucide="calendar-x" class="w-8 h-8 text-slate-300"></i>
            </div>
            <p class="text-slate-400 font-semibold">${currentFilter === 'mine' ? 'Aucune inscription' : 'Aucune mission disponible'}</p>
            <p class="text-xs text-slate-300 mt-1">${currentFilter === 'mine' ? 'Inscrivez-vous à une mission' : 'Revenez bientôt'}</p>
        </div>
    `;
}

export function initEvents() {
    createIcons({ icons });

    if (abortController) abortController.abort();
    abortController = new AbortController();
    const signal = abortController.signal;

    // Scanner Button
    document.getElementById('btn-scan-qr')?.addEventListener('click', () => {
        import('../scanner/scanner.view.js').then(m => m.ScannerView.openScanner());
    }, { signal });

    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            currentFilter = btn.dataset.filter;
            // Re-render
            import('../../core/router.js').then(({ router }) => router.handleLocation());
        }, { signal });
    });

    // Event Delegation for Registrations
    document.getElementById('events-view-container')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action="toggle-reg"]');
        if (btn && !btn.disabled) {
            const shiftId = btn.dataset.shiftId;
            const isRegistered = btn.dataset.registered === 'true';
            await handleToggleRegistration(shiftId, isRegistered);
        }
    }, { signal });
}

export function cleanup() {
    if (abortController) {
        abortController.abort();
        abortController = null;
    }
}

async function handleToggleRegistration(shiftId, isRegistered) {
    toggleLoader(true);
    try {
        const userId = store.state.user.id;
        const result = await EventsService.toggleRegistration(shiftId, userId, isRegistered);

        if (result.error) throw result.error;

        if (result.action === 'unregister') {
            showToast("Désinscription validée ✓", "success");
        } else {
            showToast("Inscription validée ! 🎉", "success");
        }

        // Refresh view
        import('../../core/router.js').then(({ router }) => router.handleLocation());

    } catch (err) {
        console.error(err);
        showToast(err.message || "Une erreur est survenue", "error");
    } finally {
        toggleLoader(false);
    }
}
