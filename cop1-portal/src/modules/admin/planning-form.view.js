
import { PlanningService } from './planning.service.js';
import { toggleLoader, showToast, escapeHtml, showConfirm, showPrompt } from '../../services/utils.js';
import { store } from '../../core/store.js';
import { createIcons, icons } from 'lucide';
import { initPlanningList } from './planning-list.view.js'; // Pour le refresh
import { t } from '../../services/i18n.js';

// --- RENDER MODAL ---

export async function openEventModal(eventToEdit = null) {
    // Si modale existe déjà, on la vire
    const existing = document.getElementById('event-modal');
    if (existing) existing.remove();

    // Template Options (Admin List for Referent)
    const adminOpts = (store.state.admins || [])
        .map(a => `<option value="${escapeHtml(a.first_name)}">${escapeHtml(a.first_name)}</option>`)
        .join('');

    // Fetch Templates
    let templateOpts = '<option value="">-- Choisir un modèle --</option>';
    try {
        const { data: tmpls } = await PlanningService.getTemplates();
        if (tmpls) {
            templateOpts += tmpls.map(t => `<option value="${t.id}">${escapeHtml(t.name)} (${escapeHtml(t.event_title)})</option>`).join('');
        }
    } catch (e) { console.error('Tpl fetch error', e); }

    const isEdit = !!eventToEdit;
    const title = isEdit ? escapeHtml(eventToEdit.title) : '';
    const location = isEdit ? escapeHtml(eventToEdit.location) : '';
    const date = isEdit ? convertDateForInput(eventToEdit.date) : '';
    const isVisible = isEdit ? (eventToEdit.is_visible !== false) : true;
    const publishAt = isEdit && eventToEdit.publish_at ? convertDateTimeForInput(eventToEdit.publish_at) : '';

    const modal = document.createElement('div');
    modal.id = 'event-modal';
    modal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';

    modal.innerHTML = `
        <div class="bg-white w-full max-w-2xl h-[90vh] rounded-[2rem] overflow-hidden flex flex-col shadow-2xl animate-slide-up">
            <!-- Header -->
            <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 class="text-xl font-extrabold text-slate-900">${isEdit ? t('admin.planning.editEvent') : t('admin.planning.createEvent')}</h3>
                <button type="button" id="btn-close-modal" class="bg-white p-2 rounded-full border border-slate-200 text-slate-500 hover:text-red-500 transition">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto p-6">
                <!-- Templates Section -->
                <div class="bg-brand-50 p-4 rounded-xl border border-brand-100 mb-6 flex flex-col md:flex-row gap-3 items-end md:items-center">
                    <div class="flex-1 w-full">
                        <label class="text-xs font-bold text-brand-700 uppercase mb-1 block">Modèles rapides</label>
                        <select id="template-select" class="w-full p-2 bg-white rounded-lg text-sm font-bold border border-brand-200 focus:border-brand-500 outline-none">
                            ${templateOpts}
                        </select>
                    </div>
                    <button type="button" id="btn-apply-template" class="w-full md:w-auto px-4 py-2 bg-brand-600 text-white font-bold rounded-lg text-sm hover:bg-brand-700 transition">
                        Appliquer
                    </button>
                    <button type="button" id="btn-save-template" class="w-full md:w-auto px-4 py-2 bg-white text-brand-600 font-bold rounded-lg text-sm border border-brand-200 hover:bg-white/80 transition" title="Sauvegarder la configuration actuelle">
                        <i data-lucide="save" class="w-4 h-4"></i>
                    </button>
                </div>

                <form id="form-event" class="space-y-8">
                    
                    <!-- Basic Info -->
                    <div class="space-y-4">
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Informations Générales</h4>
                        <div>
                            <label class="text-sm font-bold text-slate-700 block mb-1">Titre</label>
                            <input name="title" value="${title}" placeholder="Ex: Distribution Alimentaire" class="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none ring-1 ring-slate-200 focus:ring-brand-500 transition" required>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-bold text-slate-700 block mb-1">Lieu</label>
                                <input name="location" value="${location}" placeholder="Ex: 2 Bd Foch" class="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none ring-1 ring-slate-200 focus:ring-brand-500" required>
                            </div>
                            <div>
                                <label class="text-sm font-bold text-slate-700 block mb-1">Date</label>
                                <input name="date" type="date" value="${date}" class="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none ring-1 ring-slate-200 focus:ring-brand-500" required>
                            </div>
                        </div>
                    </div>

                    <div class="border-t border-slate-100 my-4"></div>

                    <!-- Shifts -->
                    <div class="space-y-4">
                        <div class="flex justify-between items-center">
                            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Créneaux Horaires</h4>
                            <button type="button" id="btn-add-shift" class="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition">
                                + Ajouter
                            </button>
                        </div>
                        
                        <div id="shifts-container" class="space-y-3">
                            <!-- Dynamic Rows Injected Here -->
                        </div>
                    </div>

                    <div class="border-t border-slate-100 my-4"></div>

                    <!-- Visibility Controls (Admin) -->
                    <div class="space-y-4">
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Visibilité</h4>
                        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                            <label class="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" name="is_visible" ${isVisible ? 'checked' : ''} class="w-5 h-5 rounded-lg border-slate-300 text-brand-600 focus:ring-brand-500">
                                <div>
                                    <span class="font-bold text-slate-700">Événement visible</span>
                                    <p class="text-xs text-slate-400">Si décoché, l'événement sera masqué aux bénévoles</p>
                                </div>
                            </label>
                            <div>
                                <label class="text-sm font-bold text-slate-700 block mb-1">Publier à partir de (optionnel)</label>
                                <input name="publish_at" type="datetime-local" value="${publishAt}" class="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none ring-1 ring-slate-200 focus:ring-brand-500">
                                <p class="text-xs text-slate-400 mt-1">L'événement sera automatiquement visible à cette date</p>
                            </div>
                        </div>
                    </div>

                </form>
            </div>

            <!-- Footer -->
            <div class="p-6 border-t border-slate-100 bg-white grid grid-cols-2 gap-4">
                <button type="button" id="btn-cancel-modal" class="py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition text-sm">Annuler</button>
                <button type="submit" id="btn-save-event" class="py-3.5 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition text-sm">
                    ${isEdit ? 'Enregistrer les modifications' : 'Publier l\'événement'}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    createIcons({ icons, root: modal });

    // --- Init Logic ---
    const container = document.getElementById('shifts-container');

    // 1. Fill Shifts
    if (isEdit && eventToEdit.shifts && eventToEdit.shifts.length > 0) {
        eventToEdit.shifts.forEach(s => {
            container.appendChild(renderShiftRow(s, adminOpts));
        });
    } else {
        // Default empty row
        container.appendChild(renderShiftRow(null, adminOpts));
    }

    // 2. Events Listeners
    modal.querySelector('#btn-close-modal').onclick = () => modal.remove();
    modal.querySelector('#btn-cancel-modal').onclick = () => modal.remove();

    modal.querySelector('#btn-add-shift').onclick = () => {
        container.appendChild(renderShiftRow(null, adminOpts));
    };

    modal.querySelector('#form-event').addEventListener('submit', (e) => {
        e.preventDefault();
        handleSave(eventToEdit ? eventToEdit.id : null);
    });

    // FIX: Also add click handler to the save button (since it's outside the form)
    modal.querySelector('#btn-save-event').addEventListener('click', (e) => {
        e.preventDefault();
        handleSave(eventToEdit ? eventToEdit.id : null);
    });

    // 3. Template Handlers
    modal.querySelector('#btn-apply-template').onclick = async () => {
        const tmplId = document.getElementById('template-select').value;
        if (!tmplId) return showToast("Veuillez sélectionner un modèle", "info");

        showConfirm('Appliquer ce modèle ? Cela remplacera les champs actuels.', async () => {
            toggleLoader(true);
            const { data: tmpls } = await PlanningService.getTemplates();
            const t = tmpls.find(x => x.id == tmplId);

            if (t) {
                document.querySelector('[name=title]').value = t.event_title || '';
                document.querySelector('[name=location]').value = t.event_location || '';

                // Rebuild shifts
                container.innerHTML = '';
                if (t.shifts_config && Array.isArray(t.shifts_config)) {
                    t.shifts_config.forEach(sc => {
                        const cleanShift = { ...sc, id: null };
                        container.appendChild(renderShiftRow(cleanShift, adminOpts));
                    });
                }
                showToast("Modèle appliqué !");
            }
            toggleLoader(false);
        });
    };

    modal.querySelector('#btn-save-template').onclick = async () => {
        const title = document.querySelector('[name=title]').value.trim();
        const location = document.querySelector('[name=location]').value.trim();

        // Gather shifts
        const shiftsData = [];
        document.querySelectorAll('.shift-row').forEach(row => {
            shiftsData.push({
                title: row.querySelector('.shift-title').value.trim(),
                start_time: row.querySelector('.shift-start').value,
                end_time: row.querySelector('.shift-end').value,
                max_slots: parseInt(row.querySelector('.shift-max').value) || 0,
                reserved_slots: parseInt(row.querySelector('.shift-res').value) || 0,
                referent_name: row.querySelector('.shift-ref').value
            });
        });

        if (!title || shiftsData.length === 0) return showToast("Titre et créneaux requis pour le modèle", "error");

        showPrompt("Nom du modèle ?", async (name) => {
            if (!name) return;

            toggleLoader(true);
            const { error } = await PlanningService.createTemplate({
                name,
                event_title: title,
                event_location: location,
                shifts_config: shiftsData
            });
            toggleLoader(false);

            if (error) showToast("Erreur sauvegarde modèle", "error");
            else {
                showToast("Modèle sauvegardé !");
                modal.remove();
                openEventModal();
            }
        }, { defaultValue: title, confirmText: 'Sauvegarder' });
    };
}

// --- HELPER RENDERING ---

function renderShiftRow(shift = null, adminOptionsHtml = '') {
    const row = document.createElement('div');
    row.className = 'shift-row bg-slate-50 p-4 rounded-xl border border-slate-200 relative group transition-all hover:bg-white hover:shadow-sm';

    // Si shift existe, on stocke son ID sur le row pour l'update
    if (shift && shift.id) {
        row.dataset.shiftId = shift.id;
    }

    // Defaults
    const title = shift ? escapeHtml(shift.title) : '';
    const start = shift ? shift.start_time.slice(0, 5) : '';
    const end = shift ? shift.end_time.slice(0, 5) : '';
    const max = shift ? shift.max_slots : 10;
    const res = shift ? shift.reserved_slots : 0;
    const ref = shift ? shift.referent_name : '';

    const isExisting = !!(shift && shift.id);

    row.innerHTML = `
        <div class="grid md:grid-cols-12 gap-3 items-start">
            
            <!-- Line 1 Desktop: Title & Ref -->
            <div class="md:col-span-5 space-y-2">
                <input type="text" placeholder="Titre (ex: Distribution)" value="${title}" class="shift-title w-full p-2 bg-white rounded-lg text-sm font-bold border-none outline-none ring-1 ring-slate-200 focus:ring-brand-500">
                
                <select class="shift-ref w-full p-2 bg-white rounded-lg text-xs font-bold ring-1 ring-slate-200 outline-none">
                    <option value="">-- Référent --</option>
                    ${adminOptionsHtml}
                </select>
            </div>

            <!-- Line 2 Desktop: Times -->
            <div class="md:col-span-4 grid grid-cols-2 gap-2">
                <div>
                    <input type="time" value="${start}" class="shift-start w-full p-2 bg-white rounded-lg text-sm font-bold ring-1 ring-slate-200 focus:ring-brand-500 text-center">
                    <label class="text-[9px] text-slate-400 font-bold uppercase block text-center mt-0.5">DÉBUT</label>
                </div>
                <div>
                    <input type="time" value="${end}" class="shift-end w-full p-2 bg-white rounded-lg text-sm font-bold ring-1 ring-slate-200 focus:ring-brand-500 text-center">
                    <label class="text-[9px] text-slate-400 font-bold uppercase block text-center mt-0.5">FIN</label>
                </div>
            </div>

            <!-- Line 3 Desktop: Slots -->
            <div class="md:col-span-2 grid grid-cols-2 gap-1">
                <div>
                    <input type="number" value="${max}" class="shift-max w-full p-2 bg-white rounded-lg text-sm font-bold ring-1 ring-slate-200 focus:ring-brand-500 text-center">
                    <label class="text-[9px] text-slate-400 font-bold uppercase block text-center mt-0.5">MAX</label>
                </div>
                <div>
                    <input type="number" value="${res}" class="shift-res w-full p-2 bg-white rounded-lg text-sm font-bold ring-1 ring-orange-200 text-orange-600 focus:ring-orange-500 text-center">
                    <label class="text-[9px] text-orange-300 font-bold uppercase block text-center mt-0.5">RÉS.</label>
                </div>
            </div>

            <!-- Delete Btn -->
            <div class="md:col-span-1 flex justify-center pt-1">
                <button type="button" class="btn-remove-shift p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Supprimer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </div>
        </div>
    `;

    // Set Select Value Manually
    if (ref) {
        const sel = row.querySelector('.shift-ref');
        if (sel) sel.value = escapeHtml(ref);
    }

    // Attach Delete Listener
    row.querySelector('.btn-remove-shift').onclick = () => handleRemoveShift(row, isExisting);

    return row;
}

async function handleRemoveShift(row, isExisting) {
    if (isExisting) {
        showConfirm("Supprimer ce créneau existant ? Cela le supprimera définitivement de la base.", async () => {
            toggleLoader(true);
            const id = row.dataset.shiftId;
            const res = await PlanningService.deleteShift(id);
            toggleLoader(false);

            if (res.error) return showToast("Erreur suppression créneau", "error");

            showToast("Créneau supprimé");
            row.remove();
        }, { type: 'danger' });
    } else {
        // Just remove from DOM
        row.remove();
    }
}

// --- SAVE HANDLER ---

async function handleSave(eventId) {
    // 1. Gather Event Data
    const form = document.querySelector('#form-event');
    const title = form.querySelector('[name="title"]').value.trim();
    const location = form.querySelector('[name="location"]').value.trim();
    const date = form.querySelector('[name="date"]').value;

    // Visibility fields
    const isVisible = form.querySelector('[name="is_visible"]')?.checked ?? true;
    const publishAtInput = form.querySelector('[name="publish_at"]')?.value;
    const publishAt = publishAtInput ? new Date(publishAtInput).toISOString() : null;

    if (!title || !location || !date) return showToast("Champs généraux incomplets", "error");

    // 2. Scan DOM for Shifts
    const shiftRows = document.querySelectorAll('.shift-row');
    const shiftsData = [];

    let hasError = false;

    shiftRows.forEach(row => {
        const t = row.querySelector('.shift-title').value.trim();
        const s = row.querySelector('.shift-start').value;
        const e = row.querySelector('.shift-end').value;
        const max = parseInt(row.querySelector('.shift-max').value) || 0;
        const res = parseInt(row.querySelector('.shift-res').value) || 0;
        const ref = row.querySelector('.shift-ref').value;
        const id = row.dataset.shiftId; // can be undefined

        if (!t || !s || !e) {
            hasError = true;
            row.classList.add('ring-2', 'ring-red-500');
            return;
        } else {
            row.classList.remove('ring-2', 'ring-red-500');
        }

        // Calculate hours_value
        const d1 = new Date(`1970-01-01T${s}:00`);
        const d2 = new Date(`1970-01-01T${e}:00`);
        const hours = parseFloat((Math.abs(d2 - d1) / 36e5).toFixed(1));

        shiftsData.push({
            id: id, // Optional
            title: t,
            start_time: s,
            end_time: e,
            max_slots: max,
            reserved_slots: res,
            referent_name: ref,
            hours_value: hours
        });
    });

    if (hasError) return showToast("Veuillez remplir les champs obligatoires des créneaux", "error");
    if (shiftsData.length === 0) return showToast("Aucun créneau défini", "warning");

    toggleLoader(true);

    try {
        let success = false;

        if (eventId) {
            // --- EDIT MODE ---
            // 1. Update Event
            const evtRes = await PlanningService.updateEvent(eventId, { title, location, date, is_visible: isVisible, publish_at: publishAt });
            if (evtRes.error) throw evtRes.error;

            // 2. Upsert Shifts
            // On boucle pour traiter chaque créneau individuellement
            const shiftPromises = shiftsData.map(s => {
                if (s.id) {
                    return PlanningService.updateShift(s.id, {
                        title: s.title,
                        start_time: s.start_time,
                        end_time: s.end_time,
                        max_slots: s.max_slots,
                        reserved_slots: s.reserved_slots,
                        referent_name: s.referent_name,
                        hours_value: s.hours_value
                    });
                } else {
                    return PlanningService.createShift({
                        event_id: eventId,
                        title: s.title,
                        start_time: s.start_time,
                        end_time: s.end_time,
                        max_slots: s.max_slots,
                        reserved_slots: s.reserved_slots,
                        referent_name: s.referent_name,
                        hours_value: s.hours_value
                    });
                }
            });

            await Promise.all(shiftPromises);
            success = true;
            showToast("Événement modifié avec succès");

        } else {
            // --- CREATE MODE ---
            const res = await PlanningService.createEvent(
                { title, location, date, is_visible: isVisible, publish_at: publishAt },
                shiftsData
            );
            if (res.error) throw res.error;
            success = true;
            showToast("Événement créé avec succès");
        }

        if (success) {
            document.getElementById('event-modal').remove();
            initPlanningList(); // Refresh List
        }

    } catch (err) {
        console.error(err);
        showToast("Erreur sauvegarde : " + (err.message || ''), "error");
    } finally {
        toggleLoader(false);
    }
}

function convertDateForInput(isoStr) {
    if (!isoStr) return '';
    return isoStr.split('T')[0]; // YYYY-MM-DD
}

function convertDateTimeForInput(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        // Format: YYYY-MM-DDTHH:MM
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
        return '';
    }
}
