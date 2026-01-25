import { PlanningService } from './planning.service.js';
import { toggleLoader, showToast, escapeHtml, showConfirm } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { openEventModal } from './planning-form.view.js';
import { openParticipantsModal } from './participants.view.js';
import { QRDisplayView } from './qr-display.view.js';

let currentTab = 'upcoming';
let searchQuery = '';
let collapsedEvents = new Set();
let abortController = null;

export function renderPlanningList() {
    return `
        <div id="admin-planning-container" class="h-full w-full pb-24 max-w-4xl mx-auto">
            <!-- PREMIUM HEADER -->
            <div class="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6 mb-6 shadow-2xl shadow-purple-500/20">
                <div class="absolute inset-0 opacity-10" style="background-image: url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"1\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
                
                <div class="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="text-white">
                        <h1 class="text-2xl font-black tracking-tight">Planning</h1>
                        <p class="text-white/70 text-sm font-medium">Gérez vos événements et créneaux</p>
                    </div>
                    
                    <!-- Stats -->
                    <div id="planning-stats" class="flex gap-3">
                        <div class="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 text-center border border-white/20">
                            <div id="stat-events" class="text-xl font-black text-white">-</div>
                            <div class="text-[9px] font-bold text-white/60 uppercase">Événements</div>
                        </div>
                        <div class="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 text-center border border-white/20">
                            <div id="stat-urgent" class="text-xl font-black text-amber-300">-</div>
                            <div class="text-[9px] font-bold text-white/60 uppercase">À pourvoir</div>
                        </div>
                        <div class="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 text-center border border-white/20">
                            <div id="stat-fill" class="text-xl font-black text-emerald-300">-</div>
                            <div class="text-[9px] font-bold text-white/60 uppercase">Rempli</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TOOLBAR -->
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
                <div class="flex flex-col md:flex-row gap-4">
                    <!-- Search -->
                    <div class="relative flex-1">
                        <i data-lucide="search" class="absolute left-4 top-3 w-4 h-4 text-slate-400"></i>
                        <input type="text" id="planning-search" placeholder="Rechercher un événement..." 
                            class="w-full pl-11 pr-4 py-2.5 bg-slate-50 rounded-xl outline-none font-medium text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition border border-slate-100">
                    </div>
                    
                    <!-- Actions -->
                    <div class="flex gap-2">
                        <button id="btn-export-planning" class="px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition flex items-center gap-2 text-sm">
                            <i data-lucide="download" class="w-4 h-4"></i>
                            <span class="hidden sm:inline">Exporter</span>
                        </button>
                        <button id="btn-create-event" class="px-5 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:shadow-xl transition flex items-center gap-2 text-sm">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            Nouveau
                        </button>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="flex gap-2 mt-4">
                    <button data-tab="upcoming" class="tab-btn active px-4 py-2 rounded-xl text-sm font-bold transition bg-slate-900 text-white shadow-md">
                        📅 À venir <span id="tab-count-upcoming" class="opacity-60"></span>
                    </button>
                    <button data-tab="history" class="tab-btn px-4 py-2 rounded-xl text-sm font-bold transition text-slate-500 bg-slate-50 hover:bg-slate-100">
                        📜 Historique
                    </button>
                    <button data-tab="templates" class="tab-btn px-4 py-2 rounded-xl text-sm font-bold transition text-slate-500 bg-slate-50 hover:bg-slate-100">
                        📋 Modèles
                    </button>
                </div>
            </div>

            <!-- LIST -->
            <div id="planning-list" class="space-y-4">
                ${renderSkeleton()}
            </div>
        </div>
    `;
}

function renderSkeleton() {
    return Array(3).fill(0).map(() => `
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 animate-pulse">
            <div class="flex gap-4">
                <div class="w-16 h-20 bg-slate-100 rounded-xl"></div>
                <div class="flex-1 space-y-2">
                    <div class="h-5 bg-slate-100 rounded w-2/3"></div>
                    <div class="h-4 bg-slate-50 rounded w-1/3"></div>
                </div>
            </div>
        </div>
    `).join('');
}

export async function initPlanningList() {
    if (abortController) abortController.abort();
    abortController = new AbortController();
    const signal = abortController.signal;

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(t => {
                t.className = 'tab-btn px-4 py-2 rounded-xl text-sm font-bold transition text-slate-500 bg-slate-50 hover:bg-slate-100';
            });
            btn.className = 'tab-btn active px-4 py-2 rounded-xl text-sm font-bold transition bg-slate-900 text-white shadow-md';
            currentTab = btn.dataset.tab;
            loadEvents();
        }, { signal });
    });

    // Create button
    document.getElementById('btn-create-event')?.addEventListener('click', () => openEventModal(), { signal });

    // Search
    let searchTimeout;
    document.getElementById('planning-search')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = e.target.value.trim().toLowerCase();
            loadEvents();
        }, 300);
    }, { signal });

    // Export
    document.getElementById('btn-export-planning')?.addEventListener('click', exportPlanning, { signal });

    // List click delegation
    document.getElementById('planning-list')?.addEventListener('click', handleListClick, { signal });

    createIcons({ icons });
    await loadEvents();
}

export function cleanup() {
    if (abortController) {
        abortController.abort();
        abortController = null;
    }
}

async function loadEvents() {
    const list = document.getElementById('planning-list');
    if (!list) return;

    list.innerHTML = renderSkeleton();

    try {
        let data, error;

        if (currentTab === 'templates') {
            const res = await PlanningService.getTemplates();
            data = res.data;
            error = res.error;
        } else {
            const res = await PlanningService.getAllEventsAdmin(currentTab);
            data = res.data;
            error = res.error;
        }

        if (error) throw error;

        // Filter by search
        if (searchQuery && data) {
            data = data.filter(e =>
                e.title?.toLowerCase().includes(searchQuery) ||
                e.location?.toLowerCase().includes(searchQuery) ||
                e.name?.toLowerCase().includes(searchQuery) // for templates
            );
        }

        // Update stats
        updateStats(data);

        // Update tab count
        const countEl = document.getElementById('tab-count-upcoming');
        if (countEl && currentTab === 'upcoming') {
            countEl.textContent = data?.length ? `(${data.length})` : '';
        }

        if (!data || data.length === 0) {
            list.innerHTML = `
                <div class="text-center py-16 bg-white rounded-2xl border border-slate-100">
                    <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="calendar-x" class="w-8 h-8 text-slate-300"></i>
                    </div>
                    <p class="text-slate-400 font-semibold">Aucun élément trouvé</p>
                    <p class="text-xs text-slate-300 mt-1">${searchQuery ? 'Modifiez votre recherche' : 'Créez votre premier événement'}</p>
                </div>
            `;
            createIcons({ icons, root: list });
        } else {
            if (currentTab === 'templates') {
                list.innerHTML = data.map(t => renderTemplateCard(t)).join('');
            } else {
                list.innerHTML = data.map(evt => renderEventCard(evt)).join('');
            }
            createIcons({ icons, root: list });
        }
    } catch (err) {
        console.error(err);
        list.innerHTML = `<div class="text-center py-16 text-red-400 font-bold">Erreur de chargement</div>`;
    }
}

function updateStats(data) {
    if (currentTab !== 'upcoming' || !data) return;

    let totalShifts = 0;
    let urgentShifts = 0;
    let totalSlots = 0;
    let filledSlots = 0;

    data.forEach(e => {
        if (e.shifts) {
            e.shifts.forEach(s => {
                totalShifts++;
                const taken = s.registrations?.[0]?.count || 0;
                const max = s.max_slots || 0;
                totalSlots += max;
                filledSlots += taken;
                if (taken < max) urgentShifts++;
            });
        }
    });

    const fillRate = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

    document.getElementById('stat-events').textContent = data.length;
    document.getElementById('stat-urgent').textContent = urgentShifts;
    document.getElementById('stat-fill').textContent = `${fillRate}%`;
}

function renderEventCard(e) {
    const date = new Date(e.date);
    const dayNum = date.getDate();
    const monthStr = date.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
    const dayStr = date.toLocaleDateString('fr-FR', { weekday: 'long' });
    const safeTitle = escapeHtml(e.title);
    const safeLoc = escapeHtml(e.location);
    const isCollapsed = collapsedEvents.has(e.id);
    const showActions = currentTab === 'upcoming';

    // Visibility
    const isVisible = e.is_visible !== false;
    const hasScheduledPublish = e.publish_at && new Date(e.publish_at) > new Date();

    let visibilityBadge = '';
    if (!isVisible) {
        visibilityBadge = `<span class="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">👁️‍🗨️ Masqué</span>`;
    } else if (hasScheduledPublish) {
        visibilityBadge = `<span class="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">⏰ Programmé</span>`;
    }

    // Calculate fill rate
    let totalSlots = 0;
    let filledSlots = 0;
    (e.shifts || []).forEach(s => {
        totalSlots += s.max_slots || 0;
        filledSlots += s.registrations?.[0]?.count || 0;
    });
    const fillRate = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;
    const fillColor = fillRate >= 80 ? 'emerald' : fillRate >= 50 ? 'amber' : 'red';

    const shiftsHtml = isCollapsed ? '' : (e.shifts || []).map(s => renderShiftItem(s, e.id)).join('');

    return `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all ${!isVisible ? 'opacity-60' : ''}" data-event-id="${e.id}">
            <!-- Header -->
            <div class="p-3 sm:p-4 flex gap-3 cursor-pointer" data-action="toggle-collapse" data-id="${e.id}">
                <!-- Date Block -->
                <div class="w-12 h-14 sm:w-14 sm:h-16 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-xl flex flex-col items-center justify-center text-white shadow-md flex-shrink-0">
                    <span class="text-lg sm:text-xl font-black leading-none">${dayNum}</span>
                    <span class="text-[8px] sm:text-[9px] font-bold opacity-80">${monthStr}</span>
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap mb-0.5">
                        <span class="text-[10px] sm:text-xs font-semibold text-slate-400 capitalize">${dayStr}</span>
                        ${visibilityBadge}
                    </div>
                    <h3 class="font-bold text-sm sm:text-base text-slate-900 truncate">${safeTitle}</h3>
                    <div class="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 mt-0.5">
                        <span class="flex items-center gap-1 truncate">
                            <i data-lucide="map-pin" class="w-3 h-3 flex-shrink-0"></i>
                            <span class="truncate">${safeLoc}</span>
                        </span>
                        <span class="text-slate-300">•</span>
                        <span>${e.shifts?.length || 0} crén.</span>
                    </div>
                </div>

                <!-- Right Side -->
                <div class="flex items-center gap-2">
                    <!-- Fill Badge (mobile) / Circle (desktop) -->
                    <div class="hidden sm:block relative w-10 h-10">
                        <svg class="w-10 h-10 transform -rotate-90">
                            <circle cx="20" cy="20" r="16" stroke="#f1f5f9" stroke-width="3" fill="transparent"/>
                            <circle cx="20" cy="20" r="16" stroke="${fillColor === 'emerald' ? '#10b981' : fillColor === 'amber' ? '#f59e0b' : '#ef4444'}" stroke-width="3" fill="transparent" 
                                stroke-dasharray="${2 * Math.PI * 16}" 
                                stroke-dashoffset="${2 * Math.PI * 16 * (1 - fillRate / 100)}" 
                                stroke-linecap="round"/>
                        </svg>
                        <span class="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600">${fillRate}%</span>
                    </div>
                    <span class="sm:hidden text-[10px] font-bold px-2 py-1 rounded-lg ${fillColor === 'emerald' ? 'bg-emerald-100 text-emerald-700' : fillColor === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}">
                        ${fillRate}%
                    </span>

                    ${showActions ? `
                    <!-- Actions Dropdown -->
                    <div class="relative">
                        <button data-action="open-actions-menu" data-id="${e.id}" class="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition" title="Actions">
                            <i data-lucide="more-vertical" class="w-5 h-5 pointer-events-none"></i>
                        </button>
                    </div>
                    ` : ''}

                    <!-- Collapse Toggle -->
                    <button data-action="toggle-collapse" data-id="${e.id}" class="p-1.5 text-slate-300 hover:text-slate-500 transition">
                        <i data-lucide="${isCollapsed ? 'chevron-down' : 'chevron-up'}" class="w-5 h-5 pointer-events-none"></i>
                    </button>
                </div>
            </div>

            <!-- Shifts (collapsible) -->
            <div class="${isCollapsed ? 'hidden' : ''} border-t border-slate-100 bg-slate-50/50 p-2 sm:p-3 space-y-1.5">
                ${shiftsHtml || '<div class="text-center text-slate-400 text-sm py-2">Aucun créneau</div>'}
            </div>
        </div>
    `;
}

function renderShiftItem(s, eventId) {
    const total = s.max_slots || 0;
    const taken = s.registrations?.[0]?.count || 0;
    const percent = total > 0 ? (taken / total) * 100 : 0;
    const isFull = taken >= total;
    const barColor = isFull ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-red-500';
    const reservedBadge = s.reserved_slots > 0 ? `<span class="text-[8px] font-bold text-orange-600 bg-orange-100 px-1 py-0.5 rounded">+${s.reserved_slots}</span>` : '';

    return `
        <div class="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-100 flex items-center gap-2 sm:gap-3 hover:shadow-sm transition">
            <!-- Time -->
            <div class="w-12 sm:w-14 text-center flex-shrink-0">
                <div class="text-xs sm:text-sm font-bold text-slate-700">${(s.start_time || '').slice(0, 5)}</div>
                <div class="text-[9px] sm:text-[10px] text-slate-400">${(s.end_time || '').slice(0, 5)}</div>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                    <span class="font-semibold text-xs sm:text-sm text-slate-800 truncate">${escapeHtml(s.title)}</span>
                    ${reservedBadge}
                </div>
                <div class="text-[9px] sm:text-[10px] text-slate-400 truncate">Réf: ${escapeHtml(s.referent_name || '-')}</div>
            </div>

            <!-- Progress -->
            <div class="w-16 sm:w-20 flex-shrink-0">
                <div class="flex items-center justify-between text-[9px] sm:text-[10px] font-bold mb-0.5">
                    <span class="${isFull ? 'text-emerald-600' : 'text-slate-500'}">${taken}/${total}</span>
                </div>
                <div class="h-1 sm:h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div class="${barColor} h-full transition-all" style="width: ${percent}%"></div>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-0.5 flex-shrink-0">
                <button data-action="view-participants" data-id="${s.id}" data-title="${escapeHtml(s.title)}" class="p-1.5 sm:p-2 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 transition" title="Inscrits">
                    <i data-lucide="users" class="w-3.5 h-3.5 sm:w-4 sm:h-4 pointer-events-none"></i>
                </button>
                <button data-action="qr-shift" data-id="${s.id}" data-title="${escapeHtml(s.title)}" class="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition" title="QR">
                    <i data-lucide="qr-code" class="w-4 h-4 pointer-events-none"></i>
                </button>
            </div>
        </div>
    `;
}

function renderTemplateCard(t) {
    const shiftCount = t.shifts_config ? t.shifts_config.length : 0;

    return `
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-lg transition group">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center text-purple-500">
                    <i data-lucide="layout-template" class="w-6 h-6"></i>
                </div>
                <div>
                    <h3 class="font-bold text-slate-900">${escapeHtml(t.name)}</h3>
                    <div class="text-xs text-slate-500 mt-0.5">
                        <span class="font-medium text-slate-700">${escapeHtml(t.event_title)}</span> 
                        • ${t.event_location ? escapeHtml(t.event_location) : 'Lieu non défini'}
                        • ${shiftCount} créneaux
                    </div>
                </div>
            </div>
            
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button data-action="use-template" data-id="${t.id}" class="px-4 py-2 bg-brand-50 text-brand-600 text-sm font-bold rounded-xl hover:bg-brand-100 transition">
                    Utiliser
                </button>
                <button data-action="delete-template" data-id="${t.id}" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition" title="Supprimer">
                    <i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i>
                </button>
            </div>
        </div>
    `;
}

async function handleListClick(e) {
    const btn = e.target.closest('button');
    const clickableArea = e.target.closest('[data-action]');
    if (!btn && !clickableArea) return;

    const action = btn?.dataset.action || clickableArea?.dataset.action;
    const id = btn?.dataset.id || clickableArea?.dataset.id;
    if (!action) return;


    if (action === 'open-actions-menu') {
        openActionsMenu(id, btn);
        return;
    }

    if (action === 'toggle-collapse') {
        if (collapsedEvents.has(parseInt(id))) {
            collapsedEvents.delete(parseInt(id));
        } else {
            collapsedEvents.add(parseInt(id));
        }
        loadEvents();
        return;
    }

    if (action === 'delete-event') {
        showConfirm("⚠️ Supprimer cet événement et tous ses créneaux ?", async () => {
            toggleLoader(true);
            const res = await PlanningService.deleteEvent(id);
            toggleLoader(false);
            if (res.error) showToast("Erreur suppression", "error");
            else { showToast("Événement supprimé"); loadEvents(); }
        }, { type: 'danger', confirmText: 'Supprimer' });

    } else if (action === 'delete-template') {
        showConfirm("Supprimer ce modèle ?", async () => {
            toggleLoader(true);
            const res = await PlanningService.deleteTemplate(id);
            toggleLoader(false);
            if (res.error) showToast("Erreur suppression", "error");
            else { showToast("Modèle supprimé"); loadEvents(); }
        }, { type: 'danger' });

    } else if (action === 'edit-event') {
        toggleLoader(true);
        const { data, error } = await PlanningService.getEventById(id);
        toggleLoader(false);
        if (error || !data) showToast("Erreur de chargement", "error");
        else openEventModal(data);

    } else if (action === 'duplicate-event') {
        toggleLoader(true);
        const { data, error } = await PlanningService.getEventById(id);
        if (error || !data) {
            toggleLoader(false);
            showToast("Erreur de chargement", "error");
            return;
        }

        // Create duplicate with new date
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + 7);

        const duplicateData = {
            title: data.title + ' (copie)',
            location: data.location,
            date: newDate.toISOString().split('T')[0],
            is_visible: false // Start hidden
        };

        const shiftsData = (data.shifts || []).map(s => ({
            title: s.title,
            start_time: s.start_time,
            end_time: s.end_time,
            max_slots: s.max_slots,
            reserved_slots: s.reserved_slots,
            referent_name: s.referent_name,
            hours_value: s.hours_value
        }));

        const res = await PlanningService.createEvent(duplicateData, shiftsData);
        toggleLoader(false);

        if (res.error) showToast("Erreur duplication", "error");
        else {
            showToast("Événement dupliqué ✓");
            loadEvents();
        }

    } else if (action === 'toggle-visibility') {
        const isCurrentlyVisible = btn.dataset.visible === 'true';
        const newVisibility = !isCurrentlyVisible;

        toggleLoader(true);
        const res = await PlanningService.updateEvent(id, { is_visible: newVisibility });
        toggleLoader(false);

        if (res.error) showToast("Erreur changement visibilité", "error");
        else {
            showToast(newVisibility ? "Événement visible" : "Événement masqué");
            loadEvents();
        }

    } else if (action === 'view-participants') {
        openParticipantsModal(id, btn.dataset.title);

    } else if (action === 'qr-shift') {
        QRDisplayView.showShiftQR(id, btn.dataset.title);

    } else if (action === 'use-template') {
        // Open modal pre-filled with template
        toggleLoader(true);
        const { data: tmpls } = await PlanningService.getTemplates();
        const template = tmpls?.find(t => t.id == id);
        toggleLoader(false);

        if (template) {
            openEventModal({
                title: template.event_title,
                location: template.event_location,
                shifts: template.shifts_config?.map(s => ({ ...s, id: null })) || []
            });
        }
    }
}

async function exportPlanning() {
    toggleLoader(true);
    const { data, error } = await PlanningService.getAllEventsAdmin(currentTab);
    toggleLoader(false);

    if (error || !data) {
        showToast("Erreur lors de l'export", "error");
        return;
    }

    // Build CSV
    const headers = ['Date', 'Événement', 'Lieu', 'Créneau', 'Horaires', 'Places max', 'Inscrits', 'Référent'];
    const rows = [];

    data.forEach(e => {
        const dateStr = new Date(e.date).toLocaleDateString('fr-FR');
        (e.shifts || []).forEach(s => {
            rows.push([
                dateStr,
                e.title,
                e.location,
                s.title,
                `${(s.start_time || '').slice(0, 5)} - ${(s.end_time || '').slice(0, 5)} `,
                s.max_slots,
                s.registrations?.[0]?.count || 0,
                s.referent_name || 'N/A'
            ]);
        });
    });

    const csv = [
        headers.join(';'),
        ...rows.map(row => row.map(c => `"${c}"`).join(';'))
    ].join('\n');

    // Download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planning_${currentTab}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Export téléchargé ✓");
}

function openActionsMenu(eventId, btnElement) {
    // Remove existing menu
    document.getElementById('event-actions-menu')?.remove();

    const menu = document.createElement('div');
    menu.id = 'event-actions-menu';
    menu.className = 'fixed inset-0 bg-black/30 z-[100] flex items-end justify-center backdrop-blur-sm animate-fade-in';

    menu.innerHTML = `
        <div class="bg-white w-full max-w-sm mx-4 mb-4 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div class="p-3 border-b border-slate-100">
                <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto"></div>
            </div>
            <div class="p-2">
                <button data-menu-action="edit" class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition text-left">
                    <div class="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                    </div>
                    <span class="font-medium text-slate-700">Modifier</span>
                </button>
                <button data-menu-action="duplicate" class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition text-left">
                    <div class="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                        <i data-lucide="copy" class="w-4 h-4"></i>
                    </div>
                    <span class="font-medium text-slate-700">Dupliquer</span>
                </button>
                <button data-menu-action="visibility" class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition text-left">
                    <div class="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </div>
                    <span class="font-medium text-slate-700">Afficher / Masquer</span>
                </button>
                <div class="h-px bg-slate-100 my-1"></div>
                <button data-menu-action="delete" class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition text-left">
                    <div class="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center text-red-500">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </div>
                    <span class="font-medium text-red-600">Supprimer</span>
                </button>
            </div>
            <button data-menu-action="close" class="w-full p-4 text-center font-semibold text-slate-400 border-t border-slate-100 hover:bg-slate-50">
                Annuler
            </button>
        </div>
    `;

    document.body.appendChild(menu);
    createIcons({ icons, root: menu });

    // Close on backdrop click
    menu.addEventListener('click', (e) => {
        if (e.target === menu) {
            menu.remove();
        }
    });

    // Handle menu actions
    menu.querySelectorAll('[data-menu-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.dataset.menuAction;
            menu.remove();

            // Find the event card to simulate button clicks
            const eventCard = document.querySelector(`[data-event-id="${eventId}"]`);

            switch (action) {
                case 'edit':
                    toggleLoader(true);
                    const { data } = await PlanningService.getEventById(eventId);
                    toggleLoader(false);
                    if (data) openEventModal(data);
                    break;
                case 'duplicate':
                    document.querySelector(`[data-action="duplicate-event"][data-id="${eventId}"]`)?.click() ||
                        handleDuplicateEvent(eventId);
                    break;
                case 'visibility':
                    handleToggleVisibility(eventId);
                    break;
                case 'delete':
                    showConfirm("⚠️ Supprimer cet événement ?", async () => {
                        toggleLoader(true);
                        await PlanningService.deleteEvent(eventId);
                        toggleLoader(false);
                        showToast("Événement supprimé");
                        loadEvents();
                    }, { type: 'danger', confirmText: 'Supprimer' });
                    break;
                case 'close':
                    break;
            }
        });
    });
}

async function handleDuplicateEvent(id) {
    toggleLoader(true);
    const { data, error } = await PlanningService.getEventById(id);
    if (error || !data) {
        toggleLoader(false);
        showToast("Erreur", "error");
        return;
    }

    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 7);

    const res = await PlanningService.createEvent({
        title: data.title + ' (copie)',
        location: data.location,
        date: newDate.toISOString().split('T')[0],
        is_visible: false
    }, (data.shifts || []).map(s => ({
        title: s.title,
        start_time: s.start_time,
        end_time: s.end_time,
        max_slots: s.max_slots,
        reserved_slots: s.reserved_slots,
        referent_name: s.referent_name,
        hours_value: s.hours_value
    })));

    toggleLoader(false);
    if (res.error) showToast("Erreur duplication", "error");
    else { showToast("Événement dupliqué ✓"); loadEvents(); }
}

async function handleToggleVisibility(id) {
    const card = document.querySelector(`[data-event-id="${id}"]`);
    const isCurrentlyVisible = !card?.classList.contains('opacity-60');

    toggleLoader(true);
    const res = await PlanningService.updateEvent(id, { is_visible: !isCurrentlyVisible });
    toggleLoader(false);

    if (res.error) showToast("Erreur", "error");
    else {
        showToast(!isCurrentlyVisible ? "Événement visible" : "Événement masqué");
        loadEvents();
    }
}
