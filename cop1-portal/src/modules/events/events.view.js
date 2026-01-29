import { EventsService } from './events.service.js';
import { supabase } from '../../services/supabase.js';
import { store } from '../../core/store.js';
import { showToast, toggleLoader, escapeHtml, showConfirm } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { PlanningService } from '../admin/planning.service.js';

let abortController = null;
let currentFilter = 'all'; // 'all' or 'mine'
let registrationSubscription = null;
let registrationRefreshTimeout = null;

export async function renderEvents() {
    toggleLoader(true);
    try {
        const userId = store.state.user?.id;

        // Parallel Data Fetching: Events + Real Counts
        const [eventsRes, countsRes] = await Promise.all([
            supabase
                .from('shifts')
                .select(`
                    *,
                    events!inner ( id, title, date, location, is_visible, publish_at, description ),
                    registrations ( user_id )
                `)
                .gte('events.date', new Date().toISOString().split('T')[0])
                .order('start_time', { ascending: true }),

            EventsService.getShiftCounts()
        ]);

        const { data: shifts, error } = eventsRes;
        const realCounts = countsRes.data || {}; // { shift_id: { total, reservedTaken } }

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
        // Render events HTML
        const eventsHtml = Object.values(eventGroups)
            .sort((a, b) => new Date(a.event.date) - new Date(b.event.date))
            .filter(group => {
                if (currentFilter === 'mine') {
                    return group.shifts.some(s => s.registrations.some(r => r.user_id === userId));
                }
                return true;
            })
            .map(group => renderEventGroup(group, userId, realCounts))
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
                    <button data-filter="all" class="filter-btn ${currentFilter === 'all' ? 'active bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100'} px-4 py-2.5 rounded-xl text-sm font-bold transition min-h-[44px] flex items-center justify-center">
                        📅 Toutes <span class="opacity-60 ml-1">(${totalMissions})</span>
                    </button>
                    <button data-filter="mine" class="filter-btn ${currentFilter === 'mine' ? 'active bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100'} px-4 py-2.5 rounded-xl text-sm font-bold transition min-h-[44px] flex items-center justify-center">
                        ✓ Mes inscriptions <span class="opacity-60 ml-1">(${myMissionsCount})</span>
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

function renderEventGroup(group, userId, countsMap) {
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

    const shiftsHtml = shifts.map(s => renderShiftCard(s, userId, countsMap, event)).join('');

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

function renderShiftCard(shift, userId, countsMap, event) {
    const isRegistered = shift.registrations.some(r => r.user_id === userId);

    // Get real counts if available, otherwise fallback to shift data
    const counts = countsMap[shift.id] || {};
    const taken = counts.total !== undefined ? counts.total : (shift.registrations ? shift.registrations.length : 0);
    const max = shift.max_slots || 0;
    const available = Math.max(0, max - taken);

    // Reserved slots logic
    const reservedTotal = shift.reserved_slots || 0;
    const reservedTaken = counts.reservedTaken !== undefined ? counts.reservedTaken : 0; // metrics often not available in simple view without rpc, but passed in countsMap
    const reservedRemaining = Math.max(0, reservedTotal - reservedTaken);
    const isReserveFull = reservedRemaining <= 0;

    const isFull = available === 0;

    // Encode event and shift data for the modal
    const eventData = encodeURIComponent(JSON.stringify(event));
    const shiftData = encodeURIComponent(JSON.stringify({
        id: shift.id,
        title: shift.title,
        start_time: shift.start_time,
        end_time: shift.end_time,
        description: shift.description,
        referent_name: shift.referent_name
    }));

    return `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-emerald-200 transition-colors group" data-shift-id="${shift.id}">
            
            <!-- Time Column -->
            <div class="flex items-center gap-4">
                <div class="w-12 sm:w-14 text-center flex-shrink-0">
                    <div class="text-xs sm:text-sm font-bold text-slate-700">${(shift.start_time || '').slice(0, 5)}</div>
                    <div class="text-[9px] sm:text-[10px] text-slate-400">${(shift.end_time || '').slice(0, 5)}</div>
                </div>
                
                <!-- Shift Info -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap mb-0.5">
                        <!-- Shift Title -->
                        <span class="font-bold text-slate-800">${escapeHtml(shift.title || 'Créneau')}</span>
                        
                        <!-- Badge Places -->
                        <div data-status-badge class="${isFull
            ? 'text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg'
            : available <= 2
                ? 'text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg'
                : 'text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg'
        }">
                            ${isFull
            ? '🔴 Complet'
            : available <= 2
                ? `🟠 <span data-available-slots>${available}</span> places`
                : `<span data-available-slots>${available}</span> places`
        }
                        </div>

                        <!-- Badge Réservé -->
                        ${reservedTotal > 0 ? `
                            <div class="${reservedRemaining > 0
                ? 'text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg'
                : 'text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg'
            }" title="${reservedRemaining} places réservées restantes">
                                <span data-reserved-badge-text>${reservedRemaining > 0 ? `🎓 ${reservedRemaining} réservées` : '🎓 Complet'}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Referent Name -->
                    ${shift.referent_name ? `
                        <div class="text-[10px] text-slate-400 flex items-center gap-1">
                            <i data-lucide="user" class="w-3 h-3"></i>
                            Réf: ${escapeHtml(shift.referent_name)}
                        </div>
                    ` : ''}
                </div>
            </div>

            <button
                data-action="toggle-reg"
                data-shift-id="${shift.id}"
                data-event="${eventData}"
                data-shift="${shiftData}"
                data-hours="${shift.hours_value || 0}"
                data-reserved-full="${isReserveFull}"
                data-registered="${isRegistered}"
                ${isFull && !isRegistered ? 'disabled' : ''}
                class="px-4 py-2 rounded-xl text-sm font-bold transition flex-shrink-0 ${isRegistered
            ? 'bg-red-100 text-red-600 hover:bg-red-200 active:scale-95'
            : isFull
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 active:scale-95'
        } min-h-[44px] flex items-center justify-center"
            >
                ${isRegistered ? 'Désister' : isFull ? '🔴 Complet' : "S'inscrire"}
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

    // Setup Realtime subscription pour les inscriptions
    setupRegistrationSubscription();

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
            const hours = parseFloat(btn.dataset.hours || 0);
            const isReserveFull = btn.dataset.reservedFull === 'true';
            const isRegistered = btn.dataset.registered === 'true';
            const eventData = btn.dataset.event ? JSON.parse(decodeURIComponent(btn.dataset.event)) : null;
            const shiftDataParsed = btn.dataset.shift ? JSON.parse(decodeURIComponent(btn.dataset.shift)) : { id: shiftId };

            await handleToggleRegistration(shiftId, isRegistered, hours, isReserveFull, eventData, shiftDataParsed);
        }
    }, { signal });
}

export function cleanup() {
    if (abortController) {
        abortController.abort();
        abortController = null;
    }
    // Cleanup realtime subscription
    if (registrationSubscription) {
        registrationSubscription.unsubscribe();
        registrationSubscription = null;
    }
    // Cleanup timeout
    if (registrationRefreshTimeout) {
        clearTimeout(registrationRefreshTimeout);
        registrationRefreshTimeout = null;
    }
}

/**
 * Configure l'écoute en temps réel des changements sur les CRÉNEAUX (shifts)
 * Grâce au trigger en base de données, la table 'shifts' est mise à jour automatiquement
 * à chaque inscription/désinscription with les nouveaux compteurs.
 */
function setupRegistrationSubscription() {
    // Arrête la subscription précédente s'il y en a une
    if (registrationSubscription) {
        supabase.removeChannel(registrationSubscription);
    }

    const channel = supabase.channel('public:shifts');

    registrationSubscription = channel
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'shifts' },
            (payload) => {
                handleShiftUpdate(payload.new);
            }
        )
        .subscribe();
}

/**
 * Met à jour UNIQUEMENT l'affichage des places pour un créneau spécifique
 * Utilise les données reçues en temps réel sans refaire de requête
 */
function handleShiftUpdate(shiftData) {
    if (!shiftData || !shiftData.id) return;

    const shiftId = shiftData.id;
    const max = shiftData.max_slots || 0;
    // Utiliser les nouvelles colonnes calculées par le trigger
    const taken = shiftData.total_registrations || 0;
    const reservedTaken = shiftData.reserved_taken || 0;
    const reservedTotal = shiftData.reserved_slots || 0;

    const available = Math.max(0, max - taken);
    const reservedRemaining = Math.max(0, reservedTotal - reservedTaken);
    // Si reservedTotal est 0, c'est considéré comme "plein" pour les places réservées
    const reservedFull = reservedRemaining <= 0;

    // 1. Trouve l'élément HTML du créneau
    const shiftEl = document.querySelector(`[data-shift-id="${shiftId}"]`);
    if (!shiftEl) return;

    // 2. Met à jour le texte des places disponibles (Standard)
    // Cherche le span dans le badge de statut ou ailleurs
    const availableSpan = shiftEl.querySelector('[data-available-slots]');
    if (availableSpan) {
        availableSpan.textContent = available;
    }

    // 3. Met à jour le texte des places réservées (Badge spécifique)
    const reservedBadgeSpan = shiftEl.querySelector('[data-reserved-badge-text]');
    if (reservedBadgeSpan) {
        if (reservedRemaining > 0) {
            reservedBadgeSpan.textContent = `🎓 ${reservedRemaining} réservées`;
            // Assure le style correct
            reservedBadgeSpan.parentElement.className = "text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg ml-1";
            reservedBadgeSpan.parentElement.title = `${reservedRemaining} places réservées restantes`;
        } else {
            reservedBadgeSpan.textContent = `🎓 Complet`;
            // Style gris
            reservedBadgeSpan.parentElement.className = "text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg ml-1";
            reservedBadgeSpan.parentElement.title = "Places réservées complètes";
        }
    }

    // 4. Met à jour l'état du bouton d'inscription
    const registerBtn = shiftEl.querySelector('[data-action="toggle-reg"]');
    if (registerBtn) {
        const isCurrentlyFull = available === 0;

        // Mise à jour dataset pour la logique du warning
        registerBtn.dataset.reservedFull = reservedFull;

        // Si l'utilisateur est DÉJÀ inscrit, on ne touche pas au bouton (il doit pouvoir se désister)
        const isRegistered = registerBtn.dataset.registered === 'true';

        if (!isRegistered) {
            if (isCurrentlyFull) {
                // Désactiver le bouton
                registerBtn.disabled = true;
                registerBtn.className = "px-4 py-2 rounded-xl text-sm font-bold transition flex-shrink-0 bg-slate-300 text-white cursor-not-allowed";
                registerBtn.textContent = '🔴 Complet';
            } else {
                // Réactiver le bouton
                registerBtn.disabled = false;
                registerBtn.className = "px-4 py-2 rounded-xl text-sm font-bold transition flex-shrink-0 bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 active:scale-95";
                registerBtn.textContent = "S'inscrire";
            }
        }
    }

    // 5. Met à jour les informations de statut visuel (couleurs du badge)
    updateMissionVisualStatus(shiftEl, available);
}

/**
 * Met à jour les visuels de statut (Badge Vert/Orange/Rouge)
 */
function updateMissionVisualStatus(shiftEl, available) {
    // Le badge est mis à jour en modifiant son contenu HTML complet pour la simplicité
    // On cherche l'élément qui a l'attribut data-status-badge
    const badgeEl = shiftEl.querySelector('[data-status-badge]');
    if (!badgeEl) return;

    if (available === 0) {
        badgeEl.className = 'text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg';
        badgeEl.innerHTML = '🔴 Complet';
    } else if (available <= 2) {
        badgeEl.className = 'text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg';
        badgeEl.innerHTML = `🟠 <span data-available-slots>${available}</span> place${available > 1 ? 's' : ''} `;
    } else {
        badgeEl.className = 'text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg'; // Ou vert si on veut
        // Remet le style par défaut (slate-400 dans le code original) ou emerald ?
        // Le code original utilisait slate-400. Le vôtre utilise emerald. Gardons une cohérence.
        // Si vous préférez Emerald :
        // badgeEl.className = 'text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg';
        badgeEl.innerHTML = `<span data-available-slots>${available}</span> places`;
    }
}

// Updated handleToggleRegistration to use Modal
async function handleToggleRegistration(shiftId, isRegistered, hours = 0, isReserveFull = false, event = null, shiftData = null) {

    // Import Modal dynamically
    const { renderRegistrationModal } = await import('./registration-modal.view.js');

    // Use the shiftData passed from the button (contains start_time, end_time, etc.)
    const shiftInfo = shiftData || { id: shiftId };

    // Create Modal Element
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = renderRegistrationModal(event, shiftInfo, isRegistered);

    document.body.appendChild(modalContainer);
    createIcons({ icons, root: modalContainer });

    // Modal Logic
    const backdrop = modalContainer.querySelector('#reg-modal-backdrop');
    const closeBtn = modalContainer.querySelector('#btn-close-modal');
    const cancelBtn = modalContainer.querySelector('#btn-cancel');
    const confirmBtn = modalContainer.querySelector('#btn-confirm-reg');
    const noteInput = modalContainer.querySelector('#reg-note');

    const closeModal = () => modalContainer.remove();

    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };

    confirmBtn.onclick = async () => {
        const note = noteInput ? noteInput.value.trim() : null;
        closeModal();

        // Proceed with verification logic (Student Quota / Reserve Full)
        if (!isRegistered && store.state.profile?.mandatory_hours) {
            // Case 1: Shift credits 0 hours anyway
            if (hours === 0) {
                const confirmed = await new Promise(resolve => {
                    showConfirm(
                        "Ce créneau ne permet pas de valider d'heures (0h). En tant qu'étudiant devant valider un quota, ces heures ne compteront pas. Voulez-vous continuer ?",
                        () => resolve(true),
                        { type: 'warning', confirmText: "M'inscrire quand même", cancelText: "Annuler", onCancel: () => resolve(false) }
                    );
                });
                if (!confirmed) return;
            }
            // Case 2: Shift has hours, but reserved slots are full
            else if (isReserveFull) {
                const confirmed = await new Promise(resolve => {
                    showConfirm(
                        "Les places réservées aux étudiants sont complètes sur ce créneau. Vous pouvez vous inscrire sur une place standard, mais vos heures NE SERONT PAS COMPTABILISÉES pour votre quota. Voulez-vous continuer ?",
                        () => resolve(true),
                        { type: 'warning', confirmText: "M'inscrire sans valider mes heures", cancelText: "Annuler", onCancel: () => resolve(false) }
                    );
                });
                if (!confirmed) return;
            }
        }

        // Execute Action
        toggleLoader(true);
        try {
            const userId = store.state.user.id;
            // Pass NOTE to service
            const result = await EventsService.toggleRegistration(shiftId, userId, isRegistered, note);

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
    };
}
