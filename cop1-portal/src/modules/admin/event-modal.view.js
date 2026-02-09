/**
 * ============================================
 * EVENT MODAL (PREMIUM REDESIGN)
 * ============================================
 * Modale premium pour créer et modifier des événements
 * - Design Glassmorphism identique aux participants
 * - Onglets Événement/Créneaux
 * - Gestion dynamique des créneaux
 * - Validation et sauvegarde
 */

import { PlanningService } from './planning.service.js';
import { DirectoryService } from './directory.service.js';
import { showToast, toggleLoader, escapeHtml, toLocalInputDate } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { store } from '../../core/store.js';

let eventState = {
    eventToEdit: null,
    currentTab: 'event', // 'event' | 'shifts'
    shifts: [], // Array of shift objects
    deletedShifts: [], // IDs of shifts to delete
    templates: [],
    admins: [], // Cache for admin users
    draft: {} // Store draft of event details
};

export async function openEventModal(eventToEdit = null) {
    eventState.eventToEdit = eventToEdit;
    eventState.currentTab = 'event';
    eventState.shifts = eventToEdit?.shifts ? JSON.parse(JSON.stringify(eventToEdit.shifts)) : [];
    eventState.deletedShifts = [];

    // Init draft with existing data or defaults
    // Note: publish_at is ISO UTC from DB
    eventState.draft = {
        title: eventToEdit?.title || '',
        location: eventToEdit?.location || '',
        date: eventToEdit?.date || '',
        description: eventToEdit?.description || '',
        global_referent: eventToEdit?.global_referent || '', // If we decide to persist it later
        publish_at: eventToEdit?.publish_at || '',
        is_visible: eventToEdit?.is_visible !== false
    };

    // Create Modal Container
    const modalId = 'event-modal-premium';
    document.getElementById(modalId)?.remove();

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto';

    document.body.appendChild(modal);

    // Initial Render
    modal.innerHTML = renderModalStructure();
    createIcons({ icons, root: modal });

    // Load Data (Templates + Admins)
    toggleLoader(true);
    await Promise.all([
        loadTemplates(),
        loadAdmins()
    ]);
    toggleLoader(false);

    // Update Content
    updateEventModalContent();

    // Setup Event Listeners
    setupEventModalListeners();
}

async function loadAdmins() {
    // Determine the user's name to add to the list if they are admin? 
    // DirectoryService.getUsers(1, 100, '', 'admin') gets admins.
    const { data } = await DirectoryService.getUsers(1, 100, '', 'admin');
    eventState.admins = data || [];
}

// =============================================================================
// 🎨 RENDERERS
// =============================================================================

function renderModalStructure() {
    return `
        <div class="bg-white rounded-2xl sm:rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-scale-in my-auto">
            <!-- Header -->
            <div class="bg-gradient-to-r from-slate-900 to-slate-800 p-4 flex justify-between items-center flex-shrink-0 relative overflow-hidden">
                <div class="absolute inset-0 bg-grid-white/5 bg-[length:20px_20px] pointer-events-none"></div>
                <div class="relative z-10 flex items-center gap-3 min-w-0 flex-1">
                    <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10 flex-shrink-0">
                        <i data-lucide="${eventState.eventToEdit ? 'edit-3' : 'calendar-plus'}" class="w-5 h-5 text-white"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h2 class="text-base sm:text-lg md:text-2xl font-black text-white tracking-tight truncate">
                            ${eventState.eventToEdit ? 'Modifier' : 'Nouvel Événement'}
                        </h2>
                        <p class="text-slate-400 text-[10px] sm:text-xs font-medium truncate hidden sm:block">Configurez les détails et les créneaux</p>
                    </div>
                </div>
                <button id="close-modal" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition flex items-center justify-center backdrop-blur-md flex-shrink-0 ml-2">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Tabs -->
            <div class="flex border-b border-slate-100 bg-slate-50/50 px-3 sm:px-6 py-2 gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
                <button data-tab="event" class="tab-btn min-w-fit px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 bg-white text-slate-900 shadow-lg whitespace-nowrap">
                    <i data-lucide="info" class="w-4 h-4 flex-shrink-0"></i>
                    <span>Infos</span>
                </button>
                <button data-tab="shifts" class="tab-btn min-w-fit px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 text-slate-500 hover:bg-white/50 whitespace-nowrap">
                    <i data-lucide="clock" class="w-4 h-4 flex-shrink-0"></i>
                    <span>Créneaux</span>
                    <span class="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md text-[10px] font-black">${eventState.shifts.length}</span>
                </button>
            </div>

            <!-- Content -->
            <div id="event-modal-content" class="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/30 scrollbar-hide relative">
                <!-- Injected via JS -->
            </div>

            <!-- Footer -->
            <div class="p-3 sm:p-4 bg-white border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-between items-center gap-3 flex-shrink-0 z-50 relative">
                ${eventState.eventToEdit ? `
                    <button id="btn-delete-event" class="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition text-sm flex items-center justify-center gap-2">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                        Supprimer
                    </button>
                ` : '<div class="hidden sm:block"></div>'}

                <button id="btn-save-event" class="w-full sm:w-auto px-6 sm:px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 shadow-lg shadow-brand-500/30 transition text-sm flex items-center justify-center gap-2">
                    <i data-lucide="check" class="w-4 h-4"></i>
                    ${eventState.eventToEdit ? 'Enregistrer' : 'Créer'}
                </button>
            </div>
        </div>
    `;
}

function renderEventTab() {
    // USe draft data
    const title = eventState.draft.title;
    const location = eventState.draft.location;
    const date = eventState.draft.date;
    const description = eventState.draft.description;
    const globalReferent = eventState.draft.global_referent || '';
    // Fix: Convert UTC ISO string to Local Input Format
    const publishAt = toLocalInputDate(eventState.draft.publish_at);
    const isVisible = eventState.draft.is_visible;

    return `
        <div class="p-3 sm:p-6 space-y-4 sm:space-y-6">
            <!-- Templates Quick Access -->
            <div class="bg-gradient-to-r from-brand-500/10 to-indigo-500/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-brand-200/50 backdrop-blur-sm">
                <h3 class="text-xs font-bold text-brand-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <i data-lucide="zap" class="w-4 h-4"></i>
                    Modèles
                </h3>
                <div class="flex flex-col sm:flex-row gap-2 relative z-50">
                    <!-- Custom Searchable Dropdown -->
                    <div class="flex-1 relative group">
                        <input type="hidden" id="template-select-hidden">
                        
                        <div class="relative">
                            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400 z-10 pointer-events-none"></i>
                            <input type="text" id="template-search" placeholder="Rechercher..." autocomplete="off"
                                class="w-full pl-10 pr-8 py-3 bg-white/80 rounded-xl border border-brand-200 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none backdrop-blur-sm placeholder:text-brand-300/70 transition-all hover:bg-white cursor-pointer group-hover:border-brand-300 text-brand-900">
                            <i id="template-chevron" data-lucide="chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400 transition-transform duration-300 pointer-events-none"></i>
                        </div>

                        <!-- Dropdown List -->
                        <div id="template-dropdown" class="absolute top-full left-0 w-full mt-2 bg-white border border-brand-100 rounded-xl shadow-xl max-h-60 overflow-y-auto hidden opacity-0 translate-y-2 transition-all duration-200 scrollbar-hide z-50">
                            <div id="template-list" class="p-1.5 space-y-0.5">
                                <!-- Options injected via JS -->
                            </div>
                        </div>
                    </div>

                    <button type="button" id="btn-apply-template" class="w-full sm:w-auto px-4 py-3 bg-brand-600 text-white font-bold rounded-xl text-sm hover:bg-brand-700 transition flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-brand-500/20 active:scale-[0.98]">
                        <i data-lucide="check" class="w-4 h-4"></i>
                        Appliquer
                    </button>
                </div>
            </div>

            <!-- Basic Info -->
            <div class="space-y-3 sm:space-y-4">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Informations</h4>
                
                <div>
                    <label class="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 mb-2 block">Titre *</label>
                    <input id="field-title" type="text" value="${escapeHtml(title)}" placeholder="Ex: Distribution Alimentaire" class="w-full p-3 bg-white rounded-xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 focus:bg-white transition-all text-base">
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 mb-2 block">Lieu *</label>
                        <input id="field-location" type="text" value="${escapeHtml(location)}" placeholder="Ex: 2 Bd Foch" class="w-full p-3 bg-white rounded-xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 transition-all text-base">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 mb-2 block">Date *</label>
                        <input id="field-date" type="date" value="${date}" class="w-full p-3 bg-white rounded-xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 transition-all text-base">
                    </div>
                </div>

                <div>
                    <label class="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 mb-2 block">Description</label>
                    <textarea id="field-description" placeholder="Décrivez l'événement..." class="w-full p-3 bg-white rounded-xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 transition-all min-h-[80px] resize-none text-base">${escapeHtml(description)}</textarea>
                </div>

                <!-- Global Referent -->
                <div class="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 relative z-40">
                    <label class="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 mb-2 block flex items-center gap-2">
                        <i data-lucide="user-check" class="w-4 h-4 text-indigo-500"></i>
                        Responsable
                    </label>
                    <div class="flex flex-col sm:flex-row gap-2 relative">
                        <div class="flex-1 relative group w-full">
                            <input type="hidden" id="field-global-referent-hidden" value="${escapeHtml(globalReferent)}">
                            
                            <div class="relative">
                                <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 z-10 pointer-events-none"></i>
                                <input type="text" id="field-global-referent-search" placeholder="Rechercher..." autocomplete="off"
                                    class="w-full pl-10 pr-8 py-3 bg-white rounded-xl border-2 border-indigo-100 text-base font-bold focus:border-indigo-400 focus:bg-white outline-none placeholder:text-indigo-300 transition-all cursor-pointer text-indigo-900" value="${escapeHtml(globalReferent)}">
                                <i id="global-referent-chevron" data-lucide="chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 transition-transform duration-300 pointer-events-none"></i>
                            </div>

                            <!-- Dropdown List -->
                            <div id="global-referent-dropdown" class="absolute top-full left-0 w-full mt-2 bg-white border border-indigo-100 rounded-xl shadow-xl max-h-60 overflow-y-auto hidden opacity-0 translate-y-2 transition-all duration-200 scrollbar-hide z-50">
                                <div id="global-referent-list" class="p-1.5 space-y-0.5">
                                    <!-- Options injected via JS -->
                                </div>
                            </div>
                        </div>

                        <button id="btn-apply-global-referent" type="button" class="w-full sm:w-auto px-4 py-3 bg-indigo-100 text-indigo-700 font-bold rounded-xl text-sm hover:bg-indigo-200 transition flex items-center justify-center gap-2 flex-shrink-0" title="Appliquer à tous les créneaux créés">
                            <i data-lucide="copy" class="w-4 h-4"></i>
                            <span>Appliquer à tout</span>
                        </button>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-2 ml-1 hidden sm:block">Sélectionnez un responsable par défaut pour tous les créneaux.</p>
                </div>

                <div>
                    <label class="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 mb-2 block">Publication (optionnel)</label>
                    <input id="field-publish-at" type="datetime-local" value="${publishAt}" class="w-full p-3 bg-white rounded-xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 transition-all text-base">
                    <p class="text-[10px] text-slate-400 mt-1">Laisser vide pour publier immédiatement</p>
                </div>

                <div class="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <input id="field-visible" type="checkbox" ${isVisible ? 'checked' : ''} class="w-6 h-6 rounded border-blue-300 text-blue-600 flex-shrink-0">
                    <label for="field-visible" class="text-sm font-bold text-blue-800 cursor-pointer">Visible pour les bénévoles</label>
                </div>
            </div>

            <!-- Save as Template -->
            ${eventState.eventToEdit ? `
            <div class="border-t border-slate-100 pt-4">
                <button id="btn-save-template" type="button" class="w-full px-4 py-3 bg-amber-50 text-amber-700 font-bold rounded-xl text-sm border border-amber-200 hover:bg-amber-100 transition flex items-center justify-center gap-2">
                    <i data-lucide="bookmark" class="w-4 h-4"></i>
                    Sauvegarder en modèle
                </button>
            </div>
            ` : ''}
        </div>
    `;
}

function renderShiftsTab() {
    // Sort shifts chronologically
    eventState.shifts.sort((a, b) => {
        return (a.start_time || '').localeCompare(b.start_time || '');
    });

    const shifts = eventState.shifts;

    return `
        <div class="p-3 sm:p-6 space-y-4">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 class="text-sm font-bold text-slate-600 uppercase tracking-wider">Créneaux</h3>
                <button id="btn-add-shift" class="w-full sm:w-auto px-4 py-3 sm:py-2 bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 transition">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                    Ajouter un créneau
                </button>
            </div>

            ${shifts.length === 0 ? `
                <div class="text-center py-8 sm:py-12 bg-white rounded-xl sm:rounded-2xl border border-slate-100">
                    <i data-lucide="calendar-x" class="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-3"></i>
                    <p class="text-slate-400 font-semibold text-sm sm:text-base">Aucun créneau</p>
                    <p class="text-[10px] sm:text-xs text-slate-300 mt-1">Cliquez sur "Ajouter un créneau"</p>
                </div>
            ` : `
                <div class="space-y-3 pb-24">
                    ${shifts.map((shift, idx) => renderShiftCard(shift, idx)).join('')}
                </div>
            `}
        </div>
    `;
}

function renderShiftCard(shift, index) {
    const startTime = shift.start_time || '';
    const endTime = shift.end_time || '';
    const capacity = shift.max_slots || shift.capacity || 1;
    const reserved = shift.reserved_slots || 0;
    const title = shift.title || '';
    const referent = shift.referent_name || '';

    // Generate unique ID suffix for this shift
    const uid = `shift-${index}-${Date.now()}`;

    return `
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative z-${50 - index}"> <!-- Z-index stacking for dropdowns -->
            <div class="flex flex-col gap-4">
                <!-- Row 1: Horaires + Titre -->
                <div class="flex flex-col gap-3">
                    <!-- Horaires -->
                    <div class="flex items-center gap-2">
                        <label class="text-xs font-bold text-slate-500 whitespace-nowrap w-16 flex-shrink-0">Horaires</label>
                        <input type="time" value="${startTime}" class="shift-start flex-1 p-3 bg-slate-50 rounded-xl text-base font-bold border border-slate-200 focus:border-brand-400 outline-none" data-idx="${index}">
                        <span class="text-slate-400 font-bold px-1">à</span>
                        <input type="time" value="${endTime}" class="shift-end flex-1 p-3 bg-slate-50 rounded-xl text-base font-bold border border-slate-200 focus:border-brand-400 outline-none" data-idx="${index}">
                    </div>

                    <!-- Titre -->
                    <div>
                        <input type="text" value="${title}" placeholder="Nom du créneau (ex: Matin)" class="shift-title w-full p-3 bg-slate-50 rounded-xl text-base font-bold border border-slate-200 focus:border-brand-400 outline-none placeholder:font-normal placeholder:text-slate-400" data-idx="${index}">
                    </div>
                </div>
            
                <!-- Row 2: Responsable & Capacité -->
                <div class="flex flex-col gap-3">
                    <!-- Responsable (Custom Dropdown) -->
                    <div class="relative group referent-dropdown-container" data-idx="${index}">
                        <input type="hidden" class="shift-referent-value" value="${escapeHtml(referent)}" data-idx="${index}">
                        
                        <div class="relative">
                            <i data-lucide="user" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none"></i>
                            <input type="text" value="${escapeHtml(referent)}" placeholder="Responsable (optionnel)" autocomplete="off"
                                class="shift-referent-search w-full pl-10 pr-10 py-3 bg-slate-50 rounded-xl text-base font-bold border border-slate-200 focus:border-brand-400 outline-none placeholder:font-normal placeholder:text-slate-400 transition-all cursor-pointer text-slate-800" data-idx="${index}">
                            <i data-lucide="chevron-down" class="shift-referent-chevron absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-transform duration-300 pointer-events-none"></i>
                        </div>

                        <!-- Dropdown List -->
                        <div class="shift-referent-list-container absolute top-full left-0 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto hidden opacity-0 translate-y-2 transition-all duration-200 scrollbar-hide z-50">
                            <div class="shift-referent-list p-2 space-y-1">
                                <!-- Options injected via JS -->
                            </div>
                        </div>
                    </div>

                    <!-- Capacités -->
                    <div class="flex gap-3">
                        <!-- Capacité -->
                        <div class="flex-1 flex gap-2 items-center">
                            <label class="text-sm font-bold text-slate-500 whitespace-nowrap">Max:</label>
                            <input type="number" value="${capacity}" min="1" class="shift-capacity p-3 bg-slate-50 rounded-xl text-base font-bold border border-slate-200 focus:border-brand-400 outline-none w-full" data-idx="${index}">
                        </div>

                        <!-- Places réservées -->
                        <div class="flex-1 flex gap-2 items-center">
                            <label class="text-sm font-bold text-slate-500 whitespace-nowrap">Réservé:</label>
                            <input type="number" value="${reserved}" min="0" class="shift-reserved p-3 bg-slate-50 rounded-xl text-base font-bold border border-slate-200 focus:border-brand-400 outline-none w-full" data-idx="${index}">
                            ${reserved > 0 ? `<span class="text-sm font-bold text-amber-600 flex-shrink-0">⚠️</span>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Delete Action -->
                <button class="btn-delete-shift w-full py-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2 font-bold text-sm" data-idx="${index}" title="Supprimer ce créneau">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                    <span>Supprimer le créneau</span>
                </button>
            </div>
        </div>
    `;
}

// =============================================================================
// 🧠 LOGIC
// =============================================================================

async function loadTemplates() {
    // Loader handled by openEventModal
    const { data } = await PlanningService.getTemplates();
    eventState.templates = data || [];
}

function initTemplateSearch() {
    const searchInput = document.getElementById('template-search');
    const hiddenInput = document.getElementById('template-select-hidden');
    const dropdown = document.getElementById('template-dropdown');
    const list = document.getElementById('template-list');
    const chevron = document.getElementById('template-chevron');

    if (!searchInput || !list) return;

    // Load templates into memory if not already (should be loaded in openEventModal)
    // eventState.templates is available

    const renderList = (filter = '') => {
        const search = filter.toLowerCase();
        const filtered = eventState.templates.filter(t =>
            t.name.toLowerCase().includes(search) ||
            t.event_title.toLowerCase().includes(search)
        );

        if (filtered.length === 0) {
            list.innerHTML = `<div class="px-3 py-4 text-xs text-slate-400 font-medium text-center italic">Aucun modèle trouvé</div>`;
            return;
        }

        list.innerHTML = filtered.map(t => `
            <div data-id="${t.id}" data-name="${escapeHtml(t.name)}" class="template-option px-3 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-brand-50 hover:text-brand-700 cursor-pointer flex items-center gap-3 transition-colors group">
                <div class="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-200 transition-colors">
                    <i data-lucide="layout-template" class="w-4 h-4"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="truncate text-slate-800 group-hover:text-brand-800">${escapeHtml(t.name)}</div>
                    <div class="text-[10px] text-slate-400 group-hover:text-brand-400 truncate font-normal">${escapeHtml(t.event_title)}</div>
                </div>
                <i data-lucide="check" class="w-4 h-4 text-brand-500 opacity-0 transition-opacity"></i>
            </div>
        `).join('');

        // Re-run icons for injected content
        createIcons({ icons, root: list });

        // Click Logic
        list.querySelectorAll('.template-option').forEach(opt => {
            opt.addEventListener('click', () => {
                selectTemplate(opt.dataset.id, opt.dataset.name);
            });
        });
    };

    const toggleDropdown = (show) => {
        if (show) {
            dropdown.classList.remove('hidden');
            requestAnimationFrame(() => {
                dropdown.classList.remove('opacity-0', 'translate-y-2');
            });
            chevron.classList.add('rotate-180');
        } else {
            dropdown.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => dropdown.classList.add('hidden'), 200);
            chevron.classList.remove('rotate-180');
        }
    };

    const selectTemplate = (id, name) => {
        hiddenInput.value = id;
        searchInput.value = name;
        toggleDropdown(false);

        // Visual feedback on input
        searchInput.classList.add('text-brand-600', 'bg-brand-50/50');
        setTimeout(() => searchInput.classList.remove('text-brand-600', 'bg-brand-50/50'), 300);
    };

    // Init Logic
    renderList();

    // Listeners
    searchInput.addEventListener('focus', () => toggleDropdown(true));
    searchInput.addEventListener('input', (e) => {
        renderList(e.target.value);
        toggleDropdown(true);
        // Reset hidden if user types something new? 
        // Better to keep it until they select or execute search.
        // Actually, if they type, it might mean they want to search, so we shouldn't clear hiddenID immediately unless we want strict selection.
        // For "Applying", we need an ID. So if text doesn't match ID, it's invalid.
        // Let's clear ID on input to force selection
        hiddenInput.value = '';
    });

    // Click outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            toggleDropdown(false);
        }
    });
}

function initGlobalReferentSearch() {
    const searchInput = document.getElementById('field-global-referent-search');
    const hiddenInput = document.getElementById('field-global-referent-hidden');
    const dropdown = document.getElementById('global-referent-dropdown');
    const list = document.getElementById('global-referent-list');
    const chevron = document.getElementById('global-referent-chevron');

    if (!searchInput || !list) return;

    const renderList = (filter = '') => {
        const search = filter.toLowerCase();
        let filtered = eventState.admins.filter(a =>
            a.first_name.toLowerCase().includes(search) ||
            a.last_name.toLowerCase().includes(search)
        );

        if (filtered.length === 0 && search) {
            list.innerHTML = `<div class="px-3 py-4 text-xs text-slate-400 font-medium text-center italic">Aucun responsable trouvé</div>`;
            return;
        }

        list.innerHTML = filtered.map(a => {
            const fullname = `${a.first_name} ${a.last_name}`;
            return `
            <div data-value="${escapeHtml(fullname)}" class="referent-option px-3 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer flex items-center gap-3 transition-colors group">
                <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 text-xs font-black">
                    ${a.first_name[0]}${a.last_name[0]}
                </div>
                <div class="flex-1 truncate">${escapeHtml(fullname)}</div>
            </div>
            `;
        }).join('');

        list.querySelectorAll('.referent-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const val = opt.dataset.value;
                hiddenInput.value = val;
                searchInput.value = val;
                eventState.draft.global_referent = val; // Update draft state
                toggleDropdown(false);
            });
        });
    };

    const toggleDropdown = (show) => {
        if (show) {
            dropdown.classList.remove('hidden');
            requestAnimationFrame(() => dropdown.classList.remove('opacity-0', 'translate-y-2'));
            chevron.classList.add('rotate-180');
        } else {
            dropdown.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => dropdown.classList.add('hidden'), 200);
            chevron.classList.remove('rotate-180');
        }
    };

    renderList();

    searchInput.addEventListener('focus', () => toggleDropdown(true));
    searchInput.addEventListener('input', (e) => {
        renderList(e.target.value);
        toggleDropdown(true);
        // Clear hidden value if user starts typing
        hiddenInput.value = '';
        eventState.draft.global_referent = ''; // Clear draft state
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            toggleDropdown(false);
        }
    });
}

function initShiftReferentsSearch() {
    const containers = document.querySelectorAll('.referent-dropdown-container');

    containers.forEach(container => {
        const idx = parseInt(container.dataset.idx);
        const searchInput = container.querySelector('.shift-referent-search');
        const hiddenInput = container.querySelector('.shift-referent-value');
        const dropdown = container.querySelector('.shift-referent-list-container');
        const list = container.querySelector('.shift-referent-list');
        const chevron = container.querySelector('.shift-referent-chevron');

        if (!searchInput || !list) return;

        const renderList = (filter = '') => {
            const search = filter.toLowerCase();
            let filtered = eventState.admins.filter(a =>
                a.first_name.toLowerCase().includes(search) ||
                a.last_name.toLowerCase().includes(search)
            );

            // Add an option to clear the referent
            const clearOption = `
                <div data-value="" class="shift-referent-option px-2 py-1.5 rounded-md text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-700 cursor-pointer flex items-center gap-2 transition-colors">
                    <i data-lucide="x-circle" class="w-5 h-5 text-red-400 flex-shrink-0"></i>
                    <div class="truncate">Aucun responsable</div>
                </div>
            `;

            if (filtered.length === 0 && search) {
                list.innerHTML = `<div class="px-3 py-2 text-[10px] text-slate-400 font-medium text-center italic">Aucun trouvé</div>` + clearOption;
                return;
            }

            list.innerHTML = filtered.map(a => {
                const fullname = `${a.first_name} ${a.last_name}`;
                return `
                <div data-value="${escapeHtml(fullname)}" class="shift-referent-option px-2 py-1.5 rounded-md text-xs font-bold text-slate-600 hover:bg-brand-50 hover:text-brand-700 cursor-pointer flex items-center gap-2 transition-colors">
                    <div class="w-5 h-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0 text-[9px] font-black">
                        ${a.first_name[0]}${a.last_name[0]}
                    </div>
                    <div class="truncate">${escapeHtml(fullname)}</div>
                </div>
                `;
            }).join('') + clearOption;

            createIcons({ icons, root: list }); // Re-run icons for the clear option

            list.querySelectorAll('.shift-referent-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    const val = opt.dataset.value;
                    searchInput.value = val;
                    hiddenInput.value = val;
                    // Update state
                    eventState.shifts[idx].referent_name = val;
                    toggleDropdown(false);
                });
            });
        };

        const toggleDropdown = (show) => {
            if (show) {
                dropdown.classList.remove('hidden');
                requestAnimationFrame(() => dropdown.classList.remove('opacity-0', 'translate-y-2'));
                chevron.classList.add('rotate-180');
            } else {
                dropdown.classList.add('opacity-0', 'translate-y-2');
                setTimeout(() => dropdown.classList.add('hidden'), 200);
                chevron.classList.remove('rotate-180');
            }
        };

        renderList();

        searchInput.addEventListener('focus', () => toggleDropdown(true));
        searchInput.addEventListener('input', (e) => {
            renderList(e.target.value);
            toggleDropdown(true);
            // Also clean state if empty or user types something new
            hiddenInput.value = '';
            eventState.shifts[idx].referent_name = '';
        });

        // Click outside listener specifically for this container
        // Note: Adding many global listeners is bad. Better to check all open dropdowns on global click.
        // But for simplicity/robustness here:
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                toggleDropdown(false);
            }
        });
    });
}

function updateEventModalContent() {
    const container = document.getElementById('event-modal-content');
    const btnEvent = document.querySelector('[data-tab="event"]');
    const btnShifts = document.querySelector('[data-tab="shifts"]');

    if (eventState.currentTab === 'event') {
        btnEvent.className = 'tab-btn px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 bg-white text-slate-900 shadow-lg';
        btnShifts.className = 'tab-btn px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 bg-white/10 text-slate-300 hover:bg-white/20';
        container.innerHTML = renderEventTab();
        // Init logic
        initTemplateSearch();
        initGlobalReferentSearch();
    } else {
        btnEvent.className = 'tab-btn px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 bg-white/10 text-slate-300 hover:bg-white/20';
        btnShifts.className = 'tab-btn px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 bg-white text-slate-900 shadow-lg';
        container.innerHTML = renderShiftsTab();
        // Init logic
        initShiftReferentsSearch();
    }

    createIcons({ icons, root: container });
}

function saveCurrentTabData() {
    if (eventState.currentTab === 'event') {
        eventState.draft.title = document.getElementById('field-title')?.value || '';
        eventState.draft.location = document.getElementById('field-location')?.value || '';
        eventState.draft.date = document.getElementById('field-date')?.value || '';
        eventState.draft.description = document.getElementById('field-description')?.value || '';
        eventState.draft.global_referent = document.getElementById('field-global-referent-hidden')?.value || '';
        eventState.draft.publish_at = document.getElementById('field-publish-at')?.value || '';
        eventState.draft.is_visible = document.getElementById('field-visible')?.checked ?? true;
    }
    // Shifts are saved in real-time via event listeners, so no need to save them here specially
}

// =============================================================================
// ⚡ EVENT SETUP
// =============================================================================

function setupEventModalListeners() {
    const modal = document.getElementById('event-modal-premium');
    if (!modal) return;

    // Close Modal
    modal.addEventListener('click', (e) => {
        if (e.target.closest('#close-modal') || e.target.closest('#close-modal-btn')) {
            modal.remove();
        }
    });

    // Tab Switching
    modal.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (tabBtn) {
            const tab = tabBtn.dataset.tab;
            if (tab !== eventState.currentTab) {
                saveCurrentTabData(); // Save before switch
                eventState.currentTab = tab;
                updateEventModalContent();
                // Rerender modal structure to update header badge
                const modal = document.getElementById('event-modal-premium');
                const header = modal.firstElementChild.firstElementChild; // The header div
                // It's easier to just re-update everything or manually toggle classes, 
                // but checking updateEventModalContent updates only content area.
                // We need to update the tab styling in header which is static in renderModalStructure? 
                // Actually renderModalStructure is called ONCE.
                // We need to re-render the tabs part or just update classes manually.

                // Let's just update the whole modal HTML is expensive? 
                // Better: just re-render the whole modal content to be safe and simple since structure depends on state
                modal.innerHTML = renderModalStructure();
                createIcons({ icons, root: modal });
                updateEventModalContent();

                // We need to re-attach listeners because we nuked DOM? 
                // No, listeners are on 'modal' (the container) which we didn't nuke (we nuked modal.innerHTML).
                // Wait, modal.innerHTML replacement removes children, so listeners attached to children are gone?
                // Setup listeners are attached to 'modal' itself via delegation.
                // "modal.addEventListener" -> Bubbling works.
                // BUT "modal.innerHTML = ..." keeps the 'modal' element, so listeners on 'modal' are preserved.
                // So this approach is fine.
            }
        }
    });

    // Save Event
    modal.addEventListener('click', async (e) => {
        if (e.target.closest('#btn-save-event')) {
            saveCurrentTabData(); // Save last changes
            await saveEvent();
        }
    });

    // Apply Template
    modal.addEventListener('click', (e) => {
        if (e.target.closest('#btn-apply-template')) {
            applyTemplate();
        }
        if (e.target.closest('#btn-apply-global-referent')) {
            // New structure: text input search or hidden?
            const globalRefSearch = document.getElementById('field-global-referent-search');

            if (!globalRefSearch || !globalRefSearch.value) {
                showToast("Sélectionnez d'abord un responsable global", "error");
                return;
            }

            const refName = globalRefSearch.value;
            // Update all current shifts
            eventState.shifts.forEach(s => s.referent_name = refName);
            showToast(`Responsable appliqué à ${eventState.shifts.length} créneau(x)`);

            // If we are in 'shifts' tab, update content to show changes? 
            // We are in 'event' tab usually when clicking this. 
            // But if we switch to shifts tab later, it will be rendered with new data.
        }
    });

    // Save as Template
    modal.addEventListener('click', async (e) => {
        if (e.target.closest('#btn-save-template')) {
            saveCurrentTabData();
            await saveAsTemplate();
        }
    });

    // Add Shift
    modal.addEventListener('click', (e) => {
        if (e.target.closest('#btn-add-shift')) {
            eventState.shifts.push({
                start_time: '09:00',
                end_time: '12:00',
                title: '',
                max_slots: 5,
                reserved_slots: 0
            });
            updateEventModalContent();
            showToast("Créneau ajouté");
        }
    });

    // Delete Shift
    modal.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-delete-shift');
        if (btn) {
            const idx = parseInt(btn.dataset.idx);
            const shiftToDelete = eventState.shifts[idx];

            // If it has an ID, track it for deletion in DB
            if (shiftToDelete.id) {
                eventState.deletedShifts.push(shiftToDelete.id);
            }

            eventState.shifts.splice(idx, 1);
            updateEventModalContent();
            showToast("Créneau supprimé");
        }
    });

    // Update Shift Data
    modal.addEventListener('change', (e) => {
        if (e.target.classList.contains('shift-start')) {
            const idx = parseInt(e.target.dataset.idx);
            eventState.shifts[idx].start_time = e.target.value;
        } else if (e.target.classList.contains('shift-end')) {
            const idx = parseInt(e.target.dataset.idx);
            eventState.shifts[idx].end_time = e.target.value;
        } else if (e.target.classList.contains('shift-capacity')) {
            const idx = parseInt(e.target.dataset.idx);
            eventState.shifts[idx].max_slots = parseInt(e.target.value) || 1;
        } else if (e.target.classList.contains('shift-reserved')) {
            const idx = parseInt(e.target.dataset.idx);
            eventState.shifts[idx].reserved_slots = parseInt(e.target.value) || 0;
        } else if (e.target.classList.contains('shift-title')) {
            const idx = parseInt(e.target.dataset.idx);
            eventState.shifts[idx].title = e.target.value;
        }
    });
}

function applyTemplate() {
    const selectHidden = document.getElementById('template-select-hidden');
    if (!selectHidden || !selectHidden.value) {
        showToast("Sélectionnez un modèle valide", "error");
        return;
    }

    const template = eventState.templates.find(t => t.id == selectHidden.value);
    if (template) {
        // Update draft
        eventState.draft.title = template.event_title || '';
        eventState.draft.location = template.event_location || '';
        eventState.draft.description = template.event_description || '';

        // Update DOM inputs immediately since we are in event tab
        document.getElementById('field-title').value = eventState.draft.title;
        document.getElementById('field-location').value = eventState.draft.location;
        document.getElementById('field-description').value = eventState.draft.description;

        // Apply shifts if template has shifts_config
        if (template.shifts_config && Array.isArray(template.shifts_config)) {
            eventState.shifts = JSON.parse(JSON.stringify(template.shifts_config));
            eventState.currentTab = 'shifts';
            updateEventModalContent();
            showToast("Modèle appliqué ✓ Vérifiez les créneaux");
        } else {
            showToast("Modèle appliqué ✓");
        }
    }
}

async function saveAsTemplate() {
    // Data is coming from draft because we called saveCurrentTabData
    const title = eventState.draft.title || '';
    const location = eventState.draft.location || '';
    const description = eventState.draft.description || '';

    if (!title || !location) {
        showToast("Remplissez le titre et le lieu d'abord", "error");
        return;
    }

    // Create custom modal for template name
    showTemplateNameModal(async (templateName) => {
        if (!templateName) return;

        toggleLoader(true);
        const templateData = {
            name: templateName,
            event_title: title,
            event_location: location,
            event_description: description,
            shifts_config: JSON.stringify(eventState.shifts)
        };

        const res = await PlanningService.createTemplate(templateData);
        toggleLoader(false);

        if (res.error) {
            showToast("Erreur: " + (res.error.message || "Échec"), "error");
        } else {
            showToast("Modèle sauvegardé ✓");
            await loadTemplates();
            updateEventModalContent();
        }
    });
}

function showTemplateNameModal(callback) {
    const existingModal = document.getElementById('template-name-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'template-name-modal';
    modal.className = 'fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in';

    modal.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-4 md:p-6 animate-scale-in">
            <h3 class="text-lg md:text-xl font-black text-slate-900 mb-4">Nom du modèle</h3>
            <input id="template-name-input" type="text" placeholder="Ex: Distribution rapide" class="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 font-semibold outline-none focus:border-brand-400 mb-4 text-sm md:text-base">
            <div class="flex gap-3 justify-end">
                <button id="template-cancel" class="px-4 py-2 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition text-sm">Annuler</button>
                <button id="template-confirm" class="px-4 py-2 rounded-lg font-bold text-white bg-brand-600 hover:bg-brand-700 transition text-sm">Confirmer</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('#template-name-input');
    const btnConfirm = modal.querySelector('#template-confirm');
    const btnCancel = modal.querySelector('#template-cancel');

    input.focus();

    const onConfirm = () => {
        const value = input.value.trim();
        modal.remove();
        callback(value || null);
    };

    btnConfirm.addEventListener('click', onConfirm);
    btnCancel.addEventListener('click', () => {
        modal.remove();
        callback(null);
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') onConfirm();
    });
}

async function saveEvent() {
    // Data is in draft
    const title = eventState.draft.title.trim();
    const location = eventState.draft.location.trim();
    const date = eventState.draft.date;
    const description = eventState.draft.description.trim();
    const publishAt = eventState.draft.publish_at;
    const isVisible = eventState.draft.is_visible;

    if (!title || !location || !date || eventState.shifts.length === 0) {
        showToast("Remplissez tous les champs et ajoutez au moins un créneau", "error");
        return;
    }

    toggleLoader(true);

    const eventData = {
        title,
        location,
        date,
        description,
        is_visible: isVisible,
        publish_at: publishAt ? new Date(publishAt).toISOString() : null
    };

    let res;
    if (eventState.eventToEdit) {
        res = await PlanningService.updateEvent(eventState.eventToEdit.id, eventData);

        if (!res.error) {
            // 1. Handle Deletions
            if (eventState.deletedShifts.length > 0) {
                for (const shiftId of eventState.deletedShifts) {
                    await PlanningService.deleteShift(shiftId);
                }
            }

            // 2. Handle Updates & Creations
            for (const shift of eventState.shifts) {
                if (shift.id) {
                    // Update existing
                    await PlanningService.updateShift(shift.id, {
                        start_time: shift.start_time,
                        end_time: shift.end_time,
                        title: shift.title,
                        max_slots: shift.max_slots,
                        reserved_slots: shift.reserved_slots,
                        referent_name: shift.referent_name
                    });
                } else {
                    // Create new
                    await PlanningService.createShift({
                        event_id: eventState.eventToEdit.id,
                        start_time: shift.start_time,
                        end_time: shift.end_time,
                        title: shift.title,
                        max_slots: shift.max_slots,
                        reserved_slots: shift.reserved_slots,
                        referent_name: shift.referent_name
                    });
                }
            }
        }
    } else {
        res = await PlanningService.createEvent(eventData, eventState.shifts);
    }

    toggleLoader(false);

    if (res.error) {
        showToast("Erreur: " + (res.error.message || "Opération échouée"), "error");
    } else {
        showToast(eventState.eventToEdit ? "Événement modifié ✓" : "Événement créé ✓");
        document.getElementById('event-modal-premium')?.remove();
        window.dispatchEvent(new CustomEvent('eventSaved'));
    }
}
