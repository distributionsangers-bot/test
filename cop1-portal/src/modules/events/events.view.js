
import { EventsService } from './events.service.js';
import { toggleLoader, showToast, escapeHtml } from '../../services/utils.js';
import { store } from '../../core/store.js';
import { createIcons } from 'lucide';

// --- HTML RENDERER ---

export function renderEvents() {
    return `
        <div id="events-view" class="h-full w-full pb-20">
            <div class="flex items-center justify-between mb-6 px-2">
                <h2 class="text-2xl font-extrabold text-slate-900">Missions</h2>
                <button id="btn-scan" class="bg-brand-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-brand-200 hover:bg-brand-700 active:scale-95 transition">
                    <i data-lucide="scan-line" class="w-7 h-7"></i>
                </button>
            </div>
            <div id="events-list" class="space-y-4">
                <!-- Squelette de chargement -->
                ${renderSkeleton()}
            </div>
        </div>
    `;
}

function renderSkeleton() {
    return Array(3).fill(0).map(() => `
        <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-4 animate-pulse">
            <div class="flex gap-4 mb-4">
                <div class="w-16 h-16 bg-slate-100 rounded-2xl flex-shrink-0"></div>
                <div class="flex-1 space-y-2 py-2">
                    <div class="h-4 bg-slate-100 rounded w-3/4"></div>
                    <div class="h-3 bg-slate-100 rounded w-1/2"></div>
                </div>
            </div>
            <div class="space-y-2">
                <div class="h-12 bg-slate-50 rounded-xl w-full"></div>
                <div class="h-12 bg-slate-50 rounded-xl w-full"></div>
            </div>
        </div>
    `).join('');
}

function renderEmptyState() {
    return `
        <div class="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            <div class="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <i data-lucide="coffee" class="w-10 h-10 text-slate-300"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-900">C'est calme par ici...</h3>
            <p class="text-sm text-slate-500 max-w-xs mt-2">Aucune mission n'est prévue pour le moment. Revenez un peu plus tard !</p>
        </div>
    `;
}

// --- LOGIC & INTERACTION ---

export async function initEvents() {
    const listContainer = document.getElementById('events-list');
    if (!listContainer) return;

    // 1. Initial Data Fetch
    await loadEvents(listContainer);

    // 2. Delegate Events (Registration Buttons)
    listContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action="toggle-reg"]');
        if (!btn) return;

        e.preventDefault();
        const shiftId = btn.dataset.shiftId;
        const isReg = btn.dataset.registered === 'true';

        await handleRegistration(btn, shiftId, isReg);
    });

    // 3. Scan Button
    const scanBtn = document.getElementById('btn-scan');
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            if (window.openScanner) {
                window.openScanner();
            } else {
                showToast("Module Scanner non chargé", "error");
            }
        });
    }

    createIcons();
}

async function loadEvents(container) {
    try {
        const userId = store.state.user.id;

        // Parallel Fetch: All Events + My Registrations
        const [eventsRes, myRegsRes] = await Promise.all([
            EventsService.getAllEvents(),
            EventsService.getMyRegistrations(userId)
        ]);

        if (eventsRes.error) throw eventsRes.error;
        if (myRegsRes.error) throw myRegsRes.error;

        const events = eventsRes.data;
        const myRegs = myRegsRes.data; // Array of shift_ids

        if (events.length === 0) {
            container.innerHTML = renderEmptyState();
        } else {
            container.innerHTML = events.map(e => createEventCard(e, myRegs)).join('');
        }
    } catch (error) {
        console.error("Load Events Error", error);
        container.innerHTML = `<div class="p-4 text-center text-red-500 font-bold">Erreur de chargement.</div>`;
    } finally {
        createIcons();
    }
}

function createEventCard(e, myRegs) {
    const date = new Date(e.date);
    const day = date.getDate();
    const month = date.toLocaleDateString('fr-FR', { month: 'short' });

    // Safety
    const safeTitle = escapeHtml(e.title);
    const safeLoc = escapeHtml(e.location || 'Lieu non défini');
    const shifts = Array.isArray(e.shifts) ? e.shifts : [];

    // Render Shifts
    const shiftsHtml = shifts.map(s => {
        const isRegistered = myRegs.includes(s.id);
        const registrations = s.registrations || [];
        // Extract count from Supabase response which might be [{count: N}] or just array length if raw
        // Service used select('..., registrations(count)') so it returns array of objects with count.
        // Wait, standard supabase select count returns [{count: N}]. 
        // Let's check service: select('*, shifts(*, registrations(count))')
        // API returns registrations: [ { count: 3 } ] usually if used properly with head/count? 
        // Actually select(..., registrations(count)) is NOT standard Supabase JS for count. 
        // Usually it's select(..., registrations!inner(count)). 
        // NOTE: The original code utilized `registrations(count)` which implies exact count.
        // Let's assume the data structure matches original usage: `taken = regs[0].count`.

        let taken = 0;
        if (registrations.length > 0 && registrations[0].count !== undefined) {
            taken = registrations[0].count;
        } else {
            taken = registrations.length; // Fallback
        }

        const total = s.max_slots || 0;
        const left = total - taken;
        const width = total > 0 ? Math.min(100, (taken / total) * 100) : 0;

        const safeShiftTitle = escapeHtml(s.title);
        const timeStr = `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`;

        // Button State
        let btnHtml = '';
        if (isRegistered) {
            btnHtml = `<button data-action="toggle-reg" data-shift-id="${s.id}" data-registered="true" class="mt-3 w-full py-2.5 bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 rounded-xl transition flex items-center justify-center gap-2">Se désister</button>`;
        } else if (left > 0) {
            btnHtml = `<button data-action="toggle-reg" data-shift-id="${s.id}" data-registered="false" class="mt-3 w-full py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition">S'inscrire</button>`;
        } else {
            btnHtml = `<button disabled class="mt-3 w-full py-2.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl cursor-not-allowed">Complet</button>`;
        }

        return `
            <div class="border border-slate-100 rounded-2xl p-4 transition-all hover:border-brand-100 ${isRegistered ? 'bg-green-50/50 border-green-200' : 'bg-slate-50'}">
                <div class="flex justify-between items-center mb-3">
                    <div>
                        <span class="font-bold text-sm text-slate-800 block">${safeShiftTitle}</span>
                        <span class="text-xs text-slate-500 font-medium">${timeStr}</span>
                    </div>
                    ${isRegistered ? '<span class="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-lg">Inscrit</span>' : ''}
                </div>

                <div class="flex items-center gap-3 mb-1">
                    <div class="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-500 ${width >= 100 ? 'bg-red-500' : 'bg-brand-500'}" style="width:${width}%"></div>
                    </div>
                    <div class="text-xs font-bold text-slate-500 whitespace-nowrap w-16 text-right">${left} places</div>
                </div>
                
                ${btnHtml}
            </div>
        `;
    }).join('');

    return `
        <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-4 animate-fade-in group">
            <div class="flex gap-4 mb-5">
                <div class="flex flex-col items-center justify-center bg-brand-50 text-brand-700 w-16 h-16 rounded-2xl flex-shrink-0 border border-brand-100/50">
                    <span class="text-[10px] font-bold uppercase tracking-wide">${month}</span>
                    <span class="text-2xl font-extrabold leading-none -mt-0.5">${day}</span>
                </div>
                <div>
                    <h3 class="font-bold text-lg text-slate-900 leading-tight mb-1">${safeTitle}</h3>
                    <div class="text-sm text-slate-500 flex items-center gap-1.5 font-medium">
                        <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i> ${safeLoc}
                    </div>
                </div>
            </div>
            <div class="space-y-3">
                ${shiftsHtml}
            </div>
        </div>
    `;
}

async function handleRegistration(btn, shiftId, isRegistered) {
    // 1. UI Loading State
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin mx-auto"></i>`;
    createIcons();

    try {
        if (isRegistered && !confirm("Voulez-vous vraiment vous désinscrire ?")) {
            btn.innerHTML = originalText;
            btn.disabled = false;
            return; // Cancel
        }

        const userId = store.state.user.id;
        const result = await EventsService.toggleRegistration(shiftId, userId, isRegistered);

        if (!result.success) throw result.error;

        showToast(isRegistered ? "Désinscription validée" : "Inscription réussie !", "success");

        // Refresh List (Or optimistically update, but refresh is safer for quotas)
        // Ideally we'd just reload data without full flicker.
        const list = document.getElementById('events-list');
        await loadEvents(list);

    } catch (err) {
        console.error("Toggle Reg Error", err);
        showToast(err.message || "Une erreur est survenue", "error");

        // Reset Button
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
