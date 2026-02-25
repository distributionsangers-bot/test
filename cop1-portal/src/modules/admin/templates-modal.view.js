/**
 * ============================================
 * TEMPLATE MODAL (PREMIUM)
 * ============================================
 * Modale premium pour créer et modifier des modèles d'événements
 */

import { PlanningService } from './planning.service.js';
import { showToast, toggleLoader, escapeHtml } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';

let templateState = {
    templateToEdit: null,
    currentTab: 'general', // 'general' | 'shifts'
    shifts: [] // Array of shift objects
};

export function openTemplateModal(templateToEdit = null) {
    templateState.templateToEdit = templateToEdit;
    templateState.currentTab = 'general';

    // Parse shifts if editing
    if (templateToEdit && templateToEdit.shifts_config) {
        templateState.shifts = Array.isArray(templateToEdit.shifts_config)
            ? JSON.parse(JSON.stringify(templateToEdit.shifts_config))
            : [];
    } else {
        templateState.shifts = [];
    }

    // Create Modal Container
    const modalId = 'template-modal-premium';
    document.getElementById(modalId)?.remove();

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in';

    document.body.appendChild(modal);

    // Initial Render
    modal.innerHTML = renderModalStructure();
    createIcons({ icons, root: modal });

    // Update Content
    updateTemplateModalContent();

    // Setup Event Listeners
    setupTemplateModalListeners();
}

// =============================================================================
// 🎨 RENDERERS
// =============================================================================

function renderModalStructure() {
    const isEdit = !!templateState.templateToEdit;

    return `
        <div class="bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-scale-in relative md:max-h-[90vh]">
            <!-- Header (Premium Gradient) -->
            <div class="relative bg-gradient-to-r from-purple-900 to-indigo-900 p-4 md:p-6 flex-shrink-0">
                <div class="absolute inset-0 bg-grid-white/5 bg-[length:20px_20px] pointer-events-none"></div>
                
                <div class="relative z-10 flex justify-between items-start">
                    <div class="min-w-0">
                        <h2 class="text-xl md:text-2xl font-black text-white tracking-tight leading-tight mb-1 truncate">
                            ${isEdit ? 'Modifier le modèle' : 'Créer un modèle'}
                        </h2>
                        <p class="text-indigo-200 font-medium text-xs md:text-sm">Configuration des événements récurrents</p>
                    </div>
                    <button id="btn-close-template-modal" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition backdrop-blur-md flex-shrink-0">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <!-- Tabs -->
                <div class="flex gap-2 md:gap-4 mt-4 md:mt-6 overflow-x-auto">
                    <button data-tab="general" class="tab-btn px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${templateState.currentTab === 'general' ? 'bg-white text-indigo-900 shadow-lg' : 'bg-white/10 text-indigo-200 hover:bg-white/20'}">
                        <i data-lucide="settings-2" class="w-4 h-4"></i>
                        Général
                    </button>
                    <button data-tab="shifts" class="tab-btn px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${templateState.currentTab === 'shifts' ? 'bg-white text-indigo-900 shadow-lg' : 'bg-white/10 text-indigo-200 hover:bg-white/20'}">
                        <i data-lucide="clock" class="w-4 h-4"></i>
                        Créneaux par défaut <span class="${templateState.currentTab === 'shifts' ? 'bg-indigo-100 text-indigo-700' : 'bg-white/20 text-white'} text-[9px] px-1.5 py-0.5 rounded-md ml-1 font-extrabold">${templateState.shifts.length}</span>
                    </button>
                </div>
            </div>

            <!-- Content Area -->
            <div id="template-modal-content" class="flex-1 overflow-y-auto bg-slate-50 relative p-4 md:p-6 space-y-4 md:space-y-6">
                <!-- Dynamically filled -->
            </div>
            
            <!-- Footer -->
            <div class="p-3 md:p-4 bg-white border-t border-slate-100 flex gap-2 md:gap-3 justify-end flex-wrap">
                <button id="btn-cancel-template" class="px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition text-sm">
                    Annuler
                </button>
                <button id="btn-save-template-final" class="px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg shadow-indigo-500/30 hover:shadow-xl transition active:scale-[0.98] flex items-center gap-2 text-sm">
                    <i data-lucide="save" class="w-4 h-4"></i>
                    <span>${isEdit ? 'Enregistrer' : 'Créer le modèle'}</span>
                </button>
            </div>
        </div>
    `;
}

function renderGeneralTab() {
    const t = templateState.templateToEdit;
    const name = t?.name || '';
    const title = t?.event_title || '';
    const location = t?.event_location || '';
    const description = t?.event_description || '';

    return `
        <div class="p-6 space-y-6">
            <!-- Template Name -->
            <div>
                <label class="text-xs font-bold text-indigo-600 uppercase tracking-wider ml-1 mb-2 block">Nom du modèle *</label>
                <input id="tmpl-name" type="text" value="${escapeHtml(name)}" placeholder="Ex: Distribution Standard" class="w-full p-4 bg-white rounded-2xl font-black text-lg border-2 border-slate-100 outline-none focus:border-indigo-400 focus:bg-white transition-all">
                <p class="text-xs text-slate-400 mt-1 ml-1">Nom interne pour retrouver ce modèle dans la liste</p>
            </div>

            <div class="h-px bg-slate-200 my-4"></div>

            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Configuration par défaut de l'événement</h4>

            <div>
                <label class="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 mb-2 block">Titre par défaut *</label>
                <input id="tmpl-title" type="text" value="${escapeHtml(title)}" placeholder="Ex: Distribution Alimentaire" class="w-full p-4 bg-white rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-indigo-400 focus:bg-white transition-all">
            </div>

            <div>
                <label class="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 mb-2 block">Lieu par défaut *</label>
                <input id="tmpl-location" type="text" value="${escapeHtml(location)}" placeholder="Ex: 2 Bd Foch" class="w-full p-4 bg-white rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-indigo-400 transition-all">
            </div>

            <div>
                <label class="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 mb-2 block">Description par défaut</label>
                <textarea id="tmpl-description" placeholder="Description automatique..." class="w-full p-4 bg-white rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-indigo-400 transition-all min-h-24 resize-none">${escapeHtml(description)}</textarea>
            </div>
        </div>
    `;
}

function renderShiftsTab() {
    const shifts = templateState.shifts;

    return `
        <div class="p-6 space-y-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-sm font-bold text-slate-600 uppercase tracking-wider">Configuration des créneaux</h3>
                <button id="btn-add-shift-tmpl" class="px-4 py-2 bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-emerald-600 transition">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                    Ajouter un créneau
                </button>
            </div>

            ${shifts.length === 0 ? `
                <div class="text-center py-12 bg-white rounded-2xl border border-slate-100">
                    <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="clock" class="w-8 h-8 text-slate-300"></i>
                    </div>
                    <p class="text-slate-400 font-semibold">Aucun créneau configuré</p>
                    <p class="text-xs text-slate-300 mt-1">Ajoutez les créneaux types pour ce modèle</p>
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
                        <input type="time" value="${startTime}" class="shift-start p-2 bg-slate-50 rounded-lg text-sm font-bold border border-slate-200 focus:border-indigo-400 outline-none w-24" data-idx="${index}">
                        <span class="text-slate-400 font-bold">à</span>
                        <input type="time" value="${endTime}" class="shift-end p-2 bg-slate-50 rounded-lg text-sm font-bold border border-slate-200 focus:border-indigo-400 outline-none w-24" data-idx="${index}">
                    </div>

                    <!-- Nom du créneau -->
                    <div>
                        <input type="text" value="${title}" placeholder="Nom du créneau (ex: Matin)" class="shift-title w-full p-2 bg-slate-50 rounded-lg text-sm font-bold border border-slate-200 focus:border-indigo-400 outline-none" data-idx="${index}">
                    </div>
                    
                    <!-- Capacité -->
                    <div class="flex flex-wrap gap-2 items-center">
                        <label class="text-xs font-bold text-slate-500 whitespace-nowrap">Capacité :</label>
                        <input type="number" value="${capacity}" min="1" class="shift-capacity p-2 bg-slate-50 rounded-lg text-sm font-bold border border-slate-200 focus:border-indigo-400 outline-none w-20" data-idx="${index}">
                        <span class="text-xs text-slate-400">place(s)</span>
                    </div>

                    <!-- Places réservées -->
                    <div class="flex flex-wrap gap-2 items-center">
                        <label class="text-xs font-bold text-slate-500 whitespace-nowrap">Places réservées :</label>
                        <input type="number" value="${reserved}" min="0" class="shift-reserved p-2 bg-slate-50 rounded-lg text-sm font-bold border border-slate-200 focus:border-indigo-400 outline-none w-20" data-idx="${index}">
                        <span class="text-xs text-slate-400">/ ${capacity}</span>
                    </div>
                </div>
                <button class="btn-delete-shift-tmpl w-10 h-10 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition flex items-center justify-center flex-shrink-0" data-idx="${index}" title="Retirer">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `;
}

// =============================================================================
// 🧠 LOGIC
// =============================================================================

function updateTemplateModalContent() {
    const container = document.getElementById('template-modal-content');
    const btnGeneral = document.querySelector('[data-tab="general"]');
    const btnShifts = document.querySelector('[data-tab="shifts"]');

    const badge = btnShifts.querySelector('span');

    if (templateState.currentTab === 'general') {
        btnGeneral.className = 'tab-btn px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap bg-white text-indigo-900 shadow-lg';
        btnShifts.className = 'tab-btn px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap bg-white/10 text-indigo-200 hover:bg-white/20';
        if (badge) badge.className = 'bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded-md ml-1 font-extrabold';
        container.innerHTML = renderGeneralTab();
    } else {
        btnGeneral.className = 'tab-btn px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap bg-white/10 text-indigo-200 hover:bg-white/20';
        btnShifts.className = 'tab-btn px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap bg-white text-indigo-900 shadow-lg';
        if (badge) badge.className = 'bg-indigo-100 text-indigo-700 text-[9px] px-1.5 py-0.5 rounded-md ml-1 font-extrabold';
        container.innerHTML = renderShiftsTab();
    }

    createIcons({ icons, root: container });
}

function setupTemplateModalListeners() {
    const modal = document.getElementById('template-modal-premium');
    if (!modal) return;

    // Close
    modal.addEventListener('click', (e) => {
        if (e.target.closest('#btn-close-template-modal') || e.target.closest('#btn-cancel-template')) {
            modal.remove();
        }
    });

    // Tab Switching
    modal.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (tabBtn) {
            const tab = tabBtn.dataset.tab;
            if (tab !== templateState.currentTab) {
                // Save current inputs to state before switching
                if (templateState.currentTab === 'general') {
                    const t = templateState.templateToEdit || {};
                    t.name = document.getElementById('tmpl-name')?.value;
                    t.event_title = document.getElementById('tmpl-title')?.value;
                    t.event_location = document.getElementById('tmpl-location')?.value;
                    t.event_description = document.getElementById('tmpl-description')?.value;
                    if (!templateState.templateToEdit) templateState.templateToEdit = t;
                }

                templateState.currentTab = tab;
                updateTemplateModalContent();
            }
        }
    });

    // Shifts Management
    modal.addEventListener('click', (e) => {
        if (e.target.closest('#btn-add-shift-tmpl')) {
            templateState.shifts.push({
                start_time: '09:00',
                end_time: '12:00',
                title: '',
                max_slots: 5,
                reserved_slots: 0
            });
            updateTemplateModalContent();
        }

        const deleteBtn = e.target.closest('.btn-delete-shift-tmpl');
        if (deleteBtn) {
            const idx = parseInt(deleteBtn.dataset.idx);
            templateState.shifts.splice(idx, 1);
            updateTemplateModalContent();
        }
    });

    // Shift Inputs
    modal.addEventListener('change', (e) => {
        if (e.target.classList.contains('shift-start')) {
            const idx = parseInt(e.target.dataset.idx);
            templateState.shifts[idx].start_time = e.target.value;
        } else if (e.target.classList.contains('shift-end')) {
            const idx = parseInt(e.target.dataset.idx);
            templateState.shifts[idx].end_time = e.target.value;
        } else if (e.target.classList.contains('shift-title')) {
            const idx = parseInt(e.target.dataset.idx);
            templateState.shifts[idx].title = e.target.value;
        } else if (e.target.classList.contains('shift-capacity')) {
            const idx = parseInt(e.target.dataset.idx);
            templateState.shifts[idx].max_slots = parseInt(e.target.value) || 1;
        } else if (e.target.classList.contains('shift-reserved')) {
            const idx = parseInt(e.target.dataset.idx);
            templateState.shifts[idx].reserved_slots = parseInt(e.target.value) || 0;
        }

        // General Inputs Backup
        if (e.target.id === 'tmpl-name' || e.target.id === 'tmpl-title' || e.target.id === 'tmpl-location' || e.target.id === 'tmpl-description') {
            if (!templateState.templateToEdit) templateState.templateToEdit = {};
            if (e.target.id === 'tmpl-name') templateState.templateToEdit.name = e.target.value;
            if (e.target.id === 'tmpl-title') templateState.templateToEdit.event_title = e.target.value;
            if (e.target.id === 'tmpl-location') templateState.templateToEdit.event_location = e.target.value;
            if (e.target.id === 'tmpl-description') templateState.templateToEdit.event_description = e.target.value;
        }
    });

    // Save Final
    modal.addEventListener('click', async (e) => {
        if (e.target.closest('#btn-save-template-final')) {
            await saveTemplate();
        }
    });
}

async function saveTemplate() {
    // Get values (or from state if we switched tabs)
    const nameInput = document.getElementById('tmpl-name');
    const titleInput = document.getElementById('tmpl-title');
    const locInput = document.getElementById('tmpl-location');
    const descInput = document.getElementById('tmpl-description');

    // If inputs are present (current tab), use them. Else use state.
    const name = nameInput ? nameInput.value.trim() : (templateState.templateToEdit?.name || '');
    const title = titleInput ? titleInput.value.trim() : (templateState.templateToEdit?.event_title || '');
    const location = locInput ? locInput.value.trim() : (templateState.templateToEdit?.event_location || '');
    const description = descInput ? descInput.value.trim() : (templateState.templateToEdit?.event_description || '');

    if (!name || !title || !location) {
        showToast("Veuillez remplir le nom, le titre et le lieu", "error");
        return;
    }

    toggleLoader(true);

    const data = {
        name,
        event_title: title,
        event_location: location,
        event_description: description,
        shifts_config: templateState.shifts // Direct array or JSON? PlanningService creates need object/JSON?
        // Service expects: shifts_config: JSON.stringify(eventState.shifts) usually?
        // Let's check `planning.service.js`. createTemplate takes object. supabase insert expects JSON for `shifts_config` column?
        // Usually Supabase handles array->jsonb automatically if column is jsonb.
        // But `event-modal.view.js` did `JSON.stringify`. Let's do same to be safe.
    };

    // Note: If using JSON column in Supabase, passing array usually works. But seeing line 423 of event-modal.view.js:
    // `shifts_config: JSON.stringify(eventState.shifts)`
    // I will replicate this.
    // However, if I pass it to updateTemplate, Supabase might expect raw JSON value, not stringified twice if the client lib handles it. 
    // BUT `event-modal.view.js` does JSON.stringify explicitly. I'll follow that pattern.
    // WAIT: `shifts_config` in `event_templates` table is likely `json` type.

    // Correction: If I send a string to a JSON column, it might be stored as a string.
    // Let's assume the previous code was working and stick to it, BUT `createTemplate` in `planning.service.js` line 272 just does `.insert([templateData])`.
    // If I look at `event-modal.view.js`:
    // `shifts_config: JSON.stringify(eventState.shifts)`
    // So I will stringify it. BUT wait, if I update it, do I need to?
    // Let's do `templateState.shifts` directly IF the service doesn't need string. 
    // Actually, `event-modal.view.js` line 393 `JSON.parse(JSON.stringify(template.shifts_config))` implies it comes back as object.
    // So commonly with supabase-js:
    // - insert: pass array/object -> stores as json
    // - select: returns array/object
    // The previous code `JSON.stringify` suggests it might be stored as text OR the dev was being extra careful.
    // I will try passing the array directly first, logic says supabase handles it. 
    // Actually, let's look at `event-modal.view.js` again. It does `JSON.stringify`.
    // I'll stick to consistency and use `templateState.shifts` (array). If `createTemplate` fails, I'll know why.
    // Wait, on line 423 of event-modal.view.js: `shifts_config: JSON.stringify(eventState.shifts)`.
    // This strongly suggests I should stringify it. BUT if I do, the `select` returns it as?
    // If it's a JSON column, Supabase returns parsed JSON.
    // If I insert a STRING into a JSON column, it becomes a string primitive inside JSON.
    // If the original code worked, I should probably do `JSON.stringify` logic OR just pass the array if I trust Supabase.
    // I will pass the ARRAY. The `event-modal` code might have been wrong or storing as text.
    // Actually, let's assume `shifts_config` is JSONB.

    const finalData = {
        name,
        event_title: title,
        event_location: location,
        event_description: description,
        shifts_config: templateState.shifts
    };

    let res;
    if (templateState.templateToEdit && templateState.templateToEdit.id) {
        res = await PlanningService.updateTemplate(templateState.templateToEdit.id, finalData);
    } else {
        res = await PlanningService.createTemplate(finalData);
    }

    toggleLoader(false);

    if (res.error) {
        showToast("Erreur sauvegarde: " + res.error.message, "error");
    } else {
        showToast("Modèle enregistré ✓");
        document.getElementById(modalId)?.remove();

        // Reload page to refresh list as requested by user
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
}
