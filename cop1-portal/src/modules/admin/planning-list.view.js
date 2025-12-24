
import { PlanningService } from './planning.service.js';
import { toggleLoader, showToast, escapeHtml } from '../../services/utils.js';
import { createIcons } from 'lucide';

import { openEventModal } from './planning-form.view.js';
import { openParticipantsModal } from './participants.view.js';
import { QRDisplayView } from './qr-display.view.js';

export function renderPlanningList() {
    return `
        <div id="admin-planning-container" class="h-full w-full pb-24">
            <div class="flex justify-between items-end mb-6">
                <div>
                    <h2 class="text-2xl font-extrabold text-slate-900">Planning</h2>
                    <p class="text-slate-500 text-sm">Gérez les missions et les créneaux.</p>
                </div>
                <button id="btn-create-event" class="bg-brand-600 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 transition flex items-center gap-2">
                    <i data-lucide="plus-circle" class="w-4 h-4"></i> Nouveau
                </button>
            </div>

            <div class="bg-white p-1 rounded-2xl border border-slate-100 flex mb-6">
                <button data-tab="upcoming" class="tab-btn flex-1 py-2 text-sm font-bold rounded-xl transition bg-slate-900 text-white shadow-md">À venir</button>
                <button data-tab="history" class="tab-btn flex-1 py-2 text-sm font-bold rounded-xl transition text-slate-500 hover:bg-slate-100">Historique</button>
            </div>

            <div id="planning-list" class="space-y-6">
                <!-- Squelette -->
                ${renderSkeleton()}
            </div>
        </div>
    `;
}

function renderSkeleton() {
    return Array(2).fill(0).map(() => `
        <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 animate-pulse mb-6">
            <div class="flex justify-between items-start mb-6">
                <div class="space-y-2">
                    <div class="h-4 bg-slate-100 rounded w-24"></div>
                    <div class="h-6 bg-slate-100 rounded w-48"></div>
                </div>
                <div class="h-8 w-20 bg-slate-100 rounded-xl"></div>
            </div>
            <div class="space-y-3">
                <div class="h-20 bg-slate-50 rounded-2xl w-full"></div>
                <div class="h-20 bg-slate-50 rounded-2xl w-full"></div>
            </div>
        </div>
    `).join('');
}

let currentTab = 'upcoming';

export async function initPlanningList() {
    // 1. Gestion des Tabs
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update UI
            tabs.forEach(t => t.className = "tab-btn flex-1 py-2 text-sm font-bold rounded-xl transition text-slate-500 hover:bg-slate-100");
            btn.className = "tab-btn flex-1 py-2 text-sm font-bold rounded-xl transition bg-slate-900 text-white shadow-md";

            // Update Data
            currentTab = btn.dataset.tab;
            loadEvents();
        });
    });

    // 2. Gestion du bouton Créer
    const createBtn = document.getElementById('btn-create-event');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            openEventModal();
        });
    }

    // 3. Délégation d'événements pour les Actions (Supprimer, Edit, etc)
    const list = document.getElementById('planning-list');
    if (list) {
        list.addEventListener('click', handleListClick);
    }

    // 4. Chargement initial
    await loadEvents();
}

async function loadEvents() {
    const list = document.getElementById('planning-list');
    if (!list) return;

    list.innerHTML = renderSkeleton();

    try {
        const { data, error } = await PlanningService.getAllEventsAdmin(currentTab);
        if (error) throw error;

        if (data.length === 0) {
            list.innerHTML = `<div class="text-center py-20 text-slate-400">Aucun événement dans cette vue.</div>`;
        } else {
            list.innerHTML = data.map(evt => renderEventCard(evt)).join('');
        }
        createIcons();
    } catch (err) {
        console.error(err);
        list.innerHTML = `<div class="text-center py-20 text-red-400">Erreur de chargement.</div>`;
    }
}

function renderEventCard(e) {
    const date = new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const safeTitle = escapeHtml(e.title);
    const safeLoc = escapeHtml(e.location);

    // Boutons d'action pour l'événement
    const showActions = currentTab === 'upcoming';

    // Rendu des créneaux
    const shiftsHtml = (e.shifts || []).map(s => renderShiftItem(s)).join('');

    return `
        <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 mb-6 group animate-fade-in">
            <div class="flex justify-between items-start mb-6">
                <div>
                    <div class="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">${date}</div>
                    <h3 class="text-xl font-extrabold text-slate-900">${safeTitle}</h3>
                    <div class="flex items-center gap-2 text-slate-500 text-sm mt-1">
                        <i data-lucide="map-pin" class="w-3 h-3"></i> ${safeLoc}
                    </div>
                </div>
                
                ${showActions ? `
                <div class="flex gap-1">
                    <button data-action="edit-event" data-id="${e.id}" class="text-slate-300 hover:text-brand-600 p-2 hover:bg-brand-50 rounded-xl transition">
                        <i data-lucide="pencil" class="w-5 h-5 pointer-events-none"></i>
                    </button>
                    <button data-action="delete-event" data-id="${e.id}" class="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition">
                        <i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i>
                    </button>
                </div>` : ''}
            </div>

            <div class="space-y-3">
                ${shiftsHtml}
            </div>
        </div>
    `;
}

function renderShiftItem(s) {
    const total = s.max_slots;
    const taken = (s.registrations && s.registrations[0]) ? s.registrations[0].count : 0;
    const percent = total > 0 ? (taken / total) * 100 : 0;
    const isFull = taken >= total;

    const reservedBadge = s.reserved_slots > 0
        ? `<span class="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded border border-orange-200 whitespace-nowrap ml-2">+${s.reserved_slots} Rés.</span>`
        : '';

    return `
        <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative group hover:shadow-sm transition-all">
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1 pr-2">
                    <div class="flex items-center flex-wrap mb-1">
                        <h4 class="font-bold text-slate-800 text-sm leading-tight">${escapeHtml(s.title)}</h4>
                        ${reservedBadge}
                    </div>
                    <div class="text-xs text-slate-500 font-medium flex items-center gap-1">
                        ${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)} 
                        <span class="text-slate-300">•</span> 
                        Ref: ${escapeHtml(s.referent_name || 'Aucun')}
                    </div>
                </div>

                <div class="text-right min-w-[60px]">
                    <div class="text-xs font-bold ${isFull ? 'text-red-500' : 'text-brand-600'} mb-1">${taken} / ${total}</div>
                    <div class="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden ml-auto">
                        <div class="h-full ${isFull ? 'bg-red-500' : 'bg-brand-500'}" style="width: ${percent}%"></div>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-slate-200/60">
                <button data-action="edit-event" data-id="${s.event_id}" class="p-2 text-slate-400 hover:text-brand-600 hover:bg-white rounded-xl transition" title="Modifier">
                    <i data-lucide="pencil" class="w-4 h-4 pointer-events-none"></i>
                </button>
                <button data-action="qr-shift" data-id="${s.id}" data-title="${escapeHtml(s.title)}" class="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition" title="QR Code">
                    <i data-lucide="qr-code" class="w-4 h-4 pointer-events-none"></i>
                </button>
                <button data-action="view-participants" data-id="${s.id}" class="flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition text-xs font-bold ml-2 border border-brand-100/50">
                    <i data-lucide="users" class="w-4 h-4 pointer-events-none"></i>
                    <span class="hidden sm:inline pointer-events-none">Inscrits</span>
                </button>
                <button data-action="delete-shift" data-id="${s.id}" class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition ml-1" title="Supprimer">
                    <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                </button>
            </div>
        </div>
    `;
}

async function handleListClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!action || !id) return;

    if (action === 'delete-event') {
        if (!confirm("⚠️ Attention : Supprimer l'événement effacera TOUS les créneaux et désinscrira les bénévoles. Continuer ?")) return;
        toggleLoader(true);
        const res = await PlanningService.deleteEvent(id);
        toggleLoader(false);
        if (res.error) showToast("Erreur suppression", "error");
        else {
            showToast("Événement supprimé");
            loadEvents();
        }
    } else if (action === 'delete-shift') {
        if (!confirm("Supprimer ce créneau ? Les bénévoles inscrits seront désinscrits.")) return;
        toggleLoader(true);
        const res = await PlanningService.deleteShift(id);
        toggleLoader(false);
        if (res.error) showToast("Erreur suppression", "error");
        else {
            showToast("Créneau supprimé");
            loadEvents();
        }
    } else if (action === 'edit-event') {
        toggleLoader(true);
        const { data, error } = await PlanningService.getEventById(id);
        toggleLoader(false);

        if (error || !data) showToast("Erreur de chargement", "error");
        else openEventModal(data);

    } else if (action === 'view-participants') {
        openParticipantsModal(id);
    } else if (action === 'qr-shift') {
        const title = btn.dataset.title;
        QRDisplayView.showShiftQR(id, title);
    }
}
