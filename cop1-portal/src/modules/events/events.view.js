import { EventsService } from './events.service.js';
import { supabase } from '../../services/supabase.js';
import { store } from '../../core/store.js';
import { showToast, toggleLoader } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';

let abortController = null;

export async function renderEvents() {
    toggleLoader(true);
    try {
        const { data: shifts, error } = await supabase
            .from('shifts')
            .select(`
                *,
                events ( title, date, location ),
                registrations ( user_id )
            `)
            .gte('events.date', new Date().toISOString().split('T')[0])
            .order('start_time', { ascending: true });

        if (error) throw error;

        // Filter out hidden events (not visible or scheduled for future)
        const now = new Date();
        const visibleShifts = shifts.filter(shift => {
            if (!shift.events) return false;

            // Check is_visible flag (default to true if not set)
            const isVisible = shift.events.is_visible !== false;

            // Check if publish_at is in the future
            const isScheduledForFuture = shift.events.publish_at && new Date(shift.events.publish_at) > now;

            return isVisible && !isScheduledForFuture;
        });

        // Client-side sort by event date
        visibleShifts.sort((a, b) => new Date(a.events.date) - new Date(b.events.date));

        const eventsHtml = visibleShifts.map(shift => {
            const isRegistered = shift.registrations.some(r => r.user_id === store.state.user.id);
            const dateObj = new Date(shift.events.date);
            const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
            const timeStr = `${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}`;

            return `
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <div class="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">${shift.events.title}</div>
                            <div class="font-bold text-lg text-slate-800 capitalize">${dateStr}</div>
                            <div class="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                <i data-lucide="clock" class="w-4 h-4"></i> ${timeStr}
                            </div>
                            <div class="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                <i data-lucide="map-pin" class="w-4 h-4"></i> ${shift.events.location}
                            </div>
                        </div>
                        <div class="h-10 w-10 rounded-full flex items-center justify-center ${isRegistered ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}">
                            <i data-lucide="${isRegistered ? 'check' : 'calendar'}" class="w-5 h-5"></i>
                        </div>
                    </div>

                    <div class="flex items-center justify-between mt-6">
                        <div class="text-xs font-bold text-slate-400">
                            ${shift.registrations.length} / ${shift.capacity} Bénévoles
                        </div>
                        <button 
                            data-action="toggle-reg" 
                            data-shift-id="${shift.id}" 
                            data-registered="${isRegistered}"
                            class="px-5 py-2 rounded-xl text-sm font-bold transition ${isRegistered
                    ? 'bg-red-50 text-red-500 hover:bg-red-100'
                    : 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-200'}"
                        >
                            ${isRegistered ? 'Me désister' : "S'inscrire"}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div id="events-view-container" class="space-y-8 animate-fade-in pb-20">
                <header class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-extrabold text-slate-900">Missions</h1>
                        <p class="text-slate-500 font-medium">Rejoignez les prochaines distributions</p>
                    </div>
                    <button id="btn-scan-qr" class="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-brand-600 transition shadow-sm">
                        <i data-lucide="scan-line" class="w-6 h-6"></i>
                    </button>
                </header>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${eventsHtml || '<p class="text-slate-500 col-span-3 text-center py-10">Aucune mission disponible pour le moment.</p>'}
                </div>
            </div>
        `;

    } catch (err) {
        console.error(err);
        return `<div class="p-10 text-center text-red-500 font-bold">Erreur de chargement des événements.</div>`;
    } finally {
        toggleLoader(false);
    }
}

export function initEvents() {
    createIcons({ icons });

    if (abortController) abortController.abort();
    abortController = new AbortController();
    const signal = abortController.signal;

    // 1. Scanner Button
    const scanBtn = document.getElementById('btn-scan-qr');
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            import('../scanner/scanner.view.js').then(m => m.ScannerView.openScanner());
        }, { signal });
    }

    // 2. Event Delegation for Registrations
    const container = document.getElementById('events-view-container');
    if (container) {
        container.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action="toggle-reg"]');
            if (btn) {
                const shiftId = btn.dataset.shiftId;
                const isRegistered = btn.dataset.registered === 'true';
                await handleToggleRegistration(shiftId, isRegistered);
            }
        }, { signal });
    }
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

        // FIX: Utilisation du service pour gérer la logique métier (RPC safe)
        const result = await EventsService.toggleRegistration(shiftId, userId, isRegistered);

        if (result.error) throw result.error;

        if (result.action === 'unregister') {
            showToast("Désinscription validée", "success");
        } else {
            showToast("Inscription validée !", "success");
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
