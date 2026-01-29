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
import { showToast, toggleLoader, escapeHtml } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { store } from '../../core/store.js';

let eventState = {
    eventToEdit: null,
    currentTab: 'event', // 'event' | 'shifts'
    shifts: [], // Array of shift objects
    templates: [],
    draft: {} // Store draft of event details
};

export async function openEventModal(eventToEdit = null) {
    eventState.eventToEdit = eventToEdit;
    eventState.currentTab = 'event';
    eventState.shifts = eventToEdit?.shifts ? JSON.parse(JSON.stringify(eventToEdit.shifts)) : [];

    // Init draft with existing data or defaults
    eventState.draft = {
        title: eventToEdit?.title || '',
        location: eventToEdit?.location || '',
        date: eventToEdit?.date || '',
        description: eventToEdit?.description || '',
        publish_at: eventToEdit?.publish_at || '',
        is_visible: eventToEdit?.is_visible !== false
    };

    // Create Modal Container
    const modalId = 'event-modal-premium';
    document.getElementById(modalId)?.remove();

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in';

    document.body.appendChild(modal);

    // Initial Render
    modal.innerHTML = renderModalStructure();
    createIcons({ icons, root: modal });

    // Load Templates
    await loadTemplates();

    // Update Content
    updateEventModalContent();

    // Setup Event Listeners
    setupEventModalListeners();
}

// =============================================================================
// 🎨 RENDERERS
// =============================================================================

function renderModalStructure() {
    const isEdit = !!eventState.eventToEdit;

    return `
        <div class="bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-scale-in relative md:max-h-[90vh]">
            <!-- Header (Premium Gradient) -->
            <div class="relative bg-gradient-to-r from-slate-900 to-slate-800 p-4 md:p-6 flex-shrink-0">
                <div class="absolute inset-0 bg-grid-white/5 bg-[length:20px_20px] pointer-events-none"></div>
                
                <div class="relative z-10 flex justify-between items-start">
                    <div class="min-w-0">
                        <h2 class="text-xl md:text-2xl font-black text-white tracking-tight leading-tight mb-1 truncate">
                            ${isEdit ? 'Modifier l\'événement' : 'Créer un événement'}
                        </h2>
                        <p class="text-slate-400 font-medium text-xs md:text-sm">Planification et gestion des créneaux</p>
                    </div>
                    <button id="btn-close-event-modal" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition backdrop-blur-md flex-shrink-0">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <!-- Tabs -->
                <div class="flex gap-2 md:gap-4 mt-4 md:mt-6 overflow-x-auto">
                    <button data-tab="event" class="tab-btn px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${eventState.currentTab === 'event' ? 'bg-white text-slate-900 shadow-lg' : 'bg-white/10 text-slate-300 hover:bg-white/20'}">
                        <i data-lucide="calendar" class="w-4 h-4"></i>
                        Événement
                    </button>
                    <button data-tab="shifts" class="tab-btn px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${eventState.currentTab === 'shifts' ? 'bg-white text-slate-900 shadow-lg' : 'bg-white/10 text-slate-300 hover:bg-white/20'}">
                        <i data-lucide="clock" class="w-4 h-4"></i>
                        Créneaux <span class="${eventState.currentTab === 'shifts' ? 'bg-slate-200 text-slate-800' : 'bg-white/20 text-white'} text-[9px] px-1.5 py-0.5 rounded-md ml-1 font-extrabold">${eventState.shifts.length}</span>
                    </button>
                </div>
            </div>

            <!-- Content Area -->
            <div id="event-modal-content" class="flex-1 overflow-y-auto bg-slate-50 relative p-4 md:p-6 space-y-4 md:space-y-6">
                <!-- Dynamically filled -->
            </div>
            
            <!-- Footer -->
            <div class="p-3 md:p-4 bg-white border-t border-slate-100 flex gap-2 md:gap-3 justify-end flex-wrap">
                <button id="btn-cancel-event" class="px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition text-sm">
                    Annuler
                </button>
                <button id="btn-save-event" class="px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold text-white bg-gradient-to-r from-brand-500 to-brand-600 shadow-lg shadow-brand-500/30 hover:shadow-xl transition active:scale-[0.98] flex items-center gap-2 text-sm">
                    <i data-lucide="${eventState.eventToEdit ? 'save' : 'plus'}" class="w-4 h-4"></i>
                    <span class="hidden md:inline">${eventState.eventToEdit ? 'Modifier' : 'Créer'}</span>
                    <span class="md:hidden">${eventState.eventToEdit ? 'Mod.' : 'Créer'}</span>
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
    const publishAt = eventState.draft.publish_at ? eventState.draft.publish_at.slice(0, 16) : '';
    const isVisible = eventState.draft.is_visible;

    return `
        <div class="p-6 space-y-6">
            <!-- Templates Quick Access -->
            <div class="bg-gradient-to-r from-brand-500/10 to-indigo-500/10 p-4 rounded-2xl border border-brand-200/50 backdrop-blur-sm">
                <h3 class="text-xs font-bold text-brand-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <i data-lucide="zap" class="w-4 h-4"></i>
                    Modèles rapides
                </h3>
                <div class="flex flex-col md:flex-row gap-2">
                    <select id="template-select" class="flex-1 p-3 bg-white/80 rounded-xl border border-brand-200 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none backdrop-blur-sm">
                        <option value="">-- Choisir un modèle --</option>
                        ${eventState.templates.map(t => `<option value="${t.id}">${escapeHtml(t.name)} (${escapeHtml(t.event_title)})</option>`).join('')}
                    </select>
                    <button type="button" id="btn-apply-template" class="px-4 py-3 bg-brand-600 text-white font-bold rounded-xl text-sm hover:bg-brand-700 transition flex items-center gap-2 whitespace-nowrap">
                        <i data-lucide="check" class="w-4 h-4"></i>
                        Appliquer
                    </button>
                </div>
            </div>

            <!-- Basic Info -->
            <div class="space-y-4">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Informations Générales</h4>
                
                <div>
                    <label class="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 mb-2 block">Titre de l'événement *</label>
                    <input id="field-title" type="text" value="${escapeHtml(title)}" placeholder="Ex: Distribution Alimentaire" class="w-full p-4 bg-white rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 focus:bg-white transition-all">
                </div>

                <div class="grid md:grid-cols-2 gap-4">
                    <div>
                        <label class="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 mb-2 block">Lieu *</label>
                        <input id="field-location" type="text" value="${escapeHtml(location)}" placeholder="Ex: 2 Bd Foch" class="w-full p-4 bg-white rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 transition-all">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 mb-2 block">Date *</label>
                        <input id="field-date" type="date" value="${date}" class="w-full p-4 bg-white rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 transition-all">
                    </div>
                </div>

                <div>
                    <label class="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 mb-2 block">Description</label>
                    <textarea id="field-description" placeholder="Décrivez l'événement..." class="w-full p-4 bg-white rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 transition-all min-h-24 resize-none">${escapeHtml(description)}</textarea>
                </div>

                <div>
                    <label class="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 mb-2 block">Date et heure de publication (optionnel)</label>
                    <input id="field-publish-at" type="datetime-local" value="${publishAt}" class="w-full p-4 bg-white rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 transition-all">
                    <p class="text-xs text-slate-400 mt-1">Laisser vide pour publier immédiatement</p>
                </div>

                <div class="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <input id="field-visible" type="checkbox" ${isVisible ? 'checked' : ''} class="w-5 h-5 rounded border-blue-300 text-blue-600">
                    <label for="field-visible" class="text-sm font-bold text-blue-800 cursor-pointer">Événement visible pour les bénévoles</label>
                </div>
            </div>

            <!-- Save as Template -->
            ${eventState.eventToEdit ? `
            <div class="border-t border-slate-100 pt-4">
                <button id="btn-save-template" type="button" class="w-full px-4 py-3 bg-amber-50 text-amber-700 font-bold rounded-xl text-sm border border-amber-200 hover:bg-amber-100 transition flex items-center justify-center gap-2">
                    <i data-lucide="bookmark" class="w-4 h-4"></i>
                    Sauvegarder cette configuration en modèle
                </button>
            </div>
            ` : ''}
        </div>
    `;
}

function renderShiftsTab() {
    const shifts = eventState.shifts;

    return `
        <div class="p-6 space-y-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-sm font-bold text-slate-600 uppercase tracking-wider">Liste des créneaux</h3>
                <button id="btn-add-shift" class="px-4 py-2 bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-emerald-600 transition">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                    Ajouter un créneau
                </button>
            </div>

            ${shifts.length === 0 ? `
                <div class="text-center py-12 bg-white rounded-2xl border border-slate-100">
                    <i data-lucide="calendar-x" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i>
                    <p class="text-slate-400 font-semibold">Aucun créneau pour le moment</p>
                    <p class="text-xs text-slate-300 mt-1">Cliquez sur "Ajouter un créneau" pour commencer</p>
                </div>
            ` : `
                <div class="space-y-3">
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

    return `
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div class="flex justify-between items-start gap-4">
                <div class="flex-1 space-y-3">
                    <!-- Horaires -->
                    <div class="flex flex-wrap gap-2 items-center">
                        <label class="text-xs font-bold text-slate-500 whitespace-nowrap">Horaires :</label>
                        <input type="time" value="${startTime}" class="shift-start p-2 bg-slate-50 rounded-lg text-sm font-bold border border-slate-200 focus:border-brand-400 outline-none w-24" data-idx="${index}">
                        <span class="text-slate-400 font-bold">à</span>
                        <input type="time" value="${endTime}" class="shift-end p-2 bg-slate-50 rounded-lg text-sm font-bold border border-slate-200 focus:border-brand-400 outline-none w-24" data-idx="${index}">
                    </div>

                    <!-- Nom du créneau -->
                    <div>
                        <input type="text" value="${title}" placeholder="Nom du créneau (ex: Matin)" class="shift-title w-full p-2 bg-slate-50 rounded-lg text-sm font-bold border border-slate-200 focus:border-brand-400 outline-none" data-idx="${index}">
                    </div>
                    
                    <!-- Capacité -->
                    <div class="flex flex-wrap gap-2 items-center">
                        <label class="text-xs font-bold text-slate-500 whitespace-nowrap">Capacité :</label>
                        <input type="number" value="${capacity}" min="1" class="shift-capacity p-2 bg-slate-50 rounded-lg text-sm font-bold border border-slate-200 focus:border-brand-400 outline-none w-20" data-idx="${index}">
                        <span class="text-xs text-slate-400">place(s)</span>
                    </div>

                    <!-- Places réservées -->
                    <div class="flex flex-wrap gap-2 items-center">
                        <label class="text-xs font-bold text-slate-500 whitespace-nowrap">Places réservées :</label>
                        <input type="number" value="${reserved}" min="0" class="shift-reserved p-2 bg-slate-50 rounded-lg text-sm font-bold border border-slate-200 focus:border-brand-400 outline-none w-20" data-idx="${index}">
                        <span class="text-xs text-slate-400">/ ${capacity}</span>
                        ${reserved > 0 ? `<span class="text-xs font-bold text-amber-600">⚠️ Réservé</span>` : ''}
                    </div>
                </div>
                <button class="btn-delete-shift w-10 h-10 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition flex items-center justify-center flex-shrink-0" data-idx="${index}" title="Supprimer ce créneau">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `;
}

// =============================================================================
// 🧠 LOGIC
// =============================================================================

async function loadTemplates() {
    toggleLoader(true);
    const { data } = await PlanningService.getTemplates();
    toggleLoader(false);
    eventState.templates = data || [];
}

function updateEventModalContent() {
    const container = document.getElementById('event-modal-content');
    const btnEvent = document.querySelector('[data-tab="event"]');
    const btnShifts = document.querySelector('[data-tab="shifts"]');

    if (eventState.currentTab === 'event') {
        btnEvent.className = 'tab-btn px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 bg-white text-slate-900 shadow-lg';
        btnShifts.className = 'tab-btn px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 bg-white/10 text-slate-300 hover:bg-white/20';
        container.innerHTML = renderEventTab();
    } else {
        btnEvent.className = 'tab-btn px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 bg-white/10 text-slate-300 hover:bg-white/20';
        btnShifts.className = 'tab-btn px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 bg-white text-slate-900 shadow-lg';
        container.innerHTML = renderShiftsTab();
    }

    createIcons({ icons, root: container });
}

function saveCurrentTabData() {
    if (eventState.currentTab === 'event') {
        eventState.draft.title = document.getElementById('field-title')?.value || '';
        eventState.draft.location = document.getElementById('field-location')?.value || '';
        eventState.draft.date = document.getElementById('field-date')?.value || '';
        eventState.draft.description = document.getElementById('field-description')?.value || '';
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

    // Close
    modal.addEventListener('click', (e) => {
        if (e.target.closest('#btn-close-event-modal') || e.target.closest('#btn-cancel-event')) {
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
    const select = document.getElementById('template-select');
    if (!select.value) {
        showToast("Sélectionnez un modèle", "error");
        return;
    }

    const template = eventState.templates.find(t => t.id == select.value);
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
            // Update shifts
            for (let i = 0; i < eventState.shifts.length; i++) {
                const shift = eventState.shifts[i];
                const existingShift = eventState.eventToEdit.shifts?.[i];

                if (existingShift) {
                    await PlanningService.updateShift(existingShift.id, {
                        start_time: shift.start_time,
                        end_time: shift.end_time,
                        title: shift.title,
                        max_slots: shift.max_slots,
                        reserved_slots: shift.reserved_slots
                    });
                } else {
                    await PlanningService.createShift({
                        event_id: eventState.eventToEdit.id,
                        start_time: shift.start_time,
                        end_time: shift.end_time,
                        title: shift.title,
                        max_slots: shift.max_slots,
                        reserved_slots: shift.reserved_slots
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
