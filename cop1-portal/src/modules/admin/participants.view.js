
import { ParticipantsService } from './participants.service.js';
import { toggleLoader, showToast, escapeHtml } from '../../services/utils.js';
import { createIcons } from 'lucide';

// --- MAIN FUNCTION ---

export async function openParticipantsModal(shiftId) {
    // 1. Loader & Clean existing
    toggleLoader(true);
    const existing = document.getElementById('participants-modal');
    if (existing) existing.remove();

    try {
        // 2. Fetch Data
        const [shiftRes, partsRes] = await Promise.all([
            ParticipantsService.getShiftDetails(shiftId),
            ParticipantsService.getShiftParticipants(shiftId)
        ]);

        if (shiftRes.error || partsRes.error) throw new Error("Erreur chargement données");

        const shift = shiftRes.data;
        const participants = partsRes.data || [];
        const evtTitle = shift.events ? shift.events.title : 'Événement';
        const shiftTime = `${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}`;

        // 3. Render Modal Shell
        const modal = document.createElement('div');
        modal.id = 'participants-modal';
        modal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';

        modal.innerHTML = `
            <div class="bg-white w-full max-w-lg h-[80vh] rounded-[2rem] overflow-hidden flex flex-col shadow-2xl animate-slide-up">
                
                <!-- Header -->
                <div class="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h3 class="text-xl font-extrabold text-slate-900 leading-tight">${escapeHtml(evtTitle)}</h3>
                            <p class="text-slate-500 text-sm font-medium mt-1">${escapeHtml(shift.title)} • ${shiftTime}</p>
                        </div>
                        <button type="button" id="btn-close-part" class="bg-white p-2 rounded-full border border-slate-200 text-slate-500 hover:text-red-500 transition">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    <div class="flex items-center gap-2 mt-2">
                        <span class="bg-brand-100 text-brand-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                            ${participants.length} / ${shift.max_slots} Inscrits
                        </span>
                        ${shift.reserved_slots > 0 ? `<span class="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-lg text-xs font-bold">${shift.reserved_slots} Réservés</span>` : ''}
                    </div>
                </div>

                <!-- List -->
                <div class="flex-1 overflow-y-auto p-4 space-y-3" id="participants-list">
                    ${participants.length === 0
                ? `<div class="text-center py-10 text-slate-400 font-medium flex flex-col items-center">
                             <i data-lucide="users" class="w-10 h-10 mb-3 opacity-50"></i>
                             Aucun bénévole inscrit.
                           </div>`
                : participants.map(p => renderParticipantItem(p)).join('')}
                </div>

            </div>
        `;

        document.body.appendChild(modal);
        createIcons({ root: modal });

        // 4. Bind Events
        modal.querySelector('#btn-close-part').onclick = () => modal.remove();

        // Delegation for item actions
        const list = modal.querySelector('#participants-list');
        list.addEventListener('click', (e) => handleItemAction(e, shiftId));

    } catch (err) {
        console.error(err);
        showToast("Impossible d'afficher les inscrits", "error");
    } finally {
        toggleLoader(false);
    }
}

// --- ITEM RENDERER ---

function renderParticipantItem(reg) {
    const p = reg.profiles;
    if (!p) return ''; // Security check

    const name = `${escapeHtml(p.first_name)} ${escapeHtml(p.last_name)}`;
    const initial = p.first_name ? p.first_name[0] : '?';
    const isPresent = !!reg.check_in_time;
    const phone = p.phone || '';

    // Status classes
    const statusClass = isPresent
        ? 'bg-green-50 border-green-200'
        : 'bg-white border-slate-100';

    return `
        <div class="participant-row relative group p-3 rounded-2xl border ${statusClass} flex items-center justify-between transition-all hover:shadow-sm" data-id="${reg.id}">
            
            <div class="flex items-center gap-3">
                <!-- Avatar -->
                <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0 uppercase border border-white shadow-sm">
                    ${initial}
                </div>
                
                <!-- Info -->
                <div class="min-w-0">
                    <div class="font-bold text-slate-900 text-sm truncate max-w-[150px] sm:max-w-[200px] leading-tight">
                        ${name}
                    </div>
                    <div class="text-xs text-slate-400 truncate">
                        ${p.email}
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1">
                
                <!-- Contact Buttons (Hidden on mobile usually or iconic) -->
                ${phone ? `
                <a href="tel:${phone}" class="p-2 text-slate-400 hover:text-brand-600 hover:bg-white rounded-xl transition hidden sm:inline-flex" title="Appeler">
                    <i data-lucide="phone" class="w-4 h-4"></i>
                </a>` : ''}
                
                <a href="mailto:${p.email}" class="p-2 text-slate-400 hover:text-brand-600 hover:bg-white rounded-xl transition hidden sm:inline-flex" title="Email">
                    <i data-lucide="mail" class="w-4 h-4"></i>
                </a>

                <div class="h-4 w-px bg-slate-200 mx-1"></div>

                <!-- Validation Toggle -->
                <button data-action="toggle-presence" data-present="${isPresent}" class="p-2 rounded-xl transition ${isPresent ? 'text-green-600 bg-green-100 hover:bg-green-200' : 'text-slate-300 hover:text-green-500 hover:bg-slate-50'}" title="${isPresent ? 'Marquer Absent' : 'Valider Présence'}">
                    <i data-lucide="check-circle-2" class="w-5 h-5 ${isPresent ? 'fill-current' : ''} pointer-events-none"></i>
                </button>

                <!-- Delete -->
                <button data-action="remove" class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition" title="Désinscrire">
                    <i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i>
                </button>
            </div>
        </div>
    `;
}

// --- ACTION HANDLER ---

async function handleItemAction(e, shiftId) {
    const btn = e.target.closest('button');
    if (!btn) return;

    const row = btn.closest('.participant-row');
    const regId = row.dataset.id;
    const action = btn.dataset.action;

    if (action === 'toggle-presence') {
        const wasPresent = btn.dataset.present === 'true';
        const newStatus = !wasPresent;

        // Optimistic UI update could be tricky if we want full render, but let's try direct style swap or reload
        // Simplest: Call service, then fetch list again OR update DOM locally
        // Updating DOM locally is faster for UX

        const success = await callValidate(regId, newStatus);
        if (success) {
            // Re-render just this item ? Or toggle classes manually
            // Let's toggle classes manualy for speed
            btn.dataset.present = newStatus;
            const icon = btn.querySelector('i');

            if (newStatus) {
                // Became Present
                row.className = row.className.replace('bg-white border-slate-100', 'bg-green-50 border-green-200');
                btn.className = "p-2 rounded-xl transition text-green-600 bg-green-100 hover:bg-green-200";
                icon.classList.add('fill-current');
                showToast("Bénévole marqué présent");
            } else {
                // Became Absent
                row.className = row.className.replace('bg-green-50 border-green-200', 'bg-white border-slate-100');
                btn.className = "p-2 rounded-xl transition text-slate-300 hover:text-green-500 hover:bg-slate-50";
                icon.classList.remove('fill-current');
                // showToast("Validation annulée", "info");
            }
        }
    }
    else if (action === 'remove') {
        if (!confirm("Désinscrire ce bénévole ? Il recevra une notification (si implémenté).")) return;

        toggleLoader(true);
        const res = await ParticipantsService.removeParticipant(regId);
        toggleLoader(false);

        if (res.error) return showToast("Erreur désinscription", "error");

        showToast("Désinscription effectuée");
        row.remove();

        // Could update counters in header theoretically, but might be overkill to parse DOM
    }
}

async function callValidate(id, status) {
    const res = await ParticipantsService.validateParticipant(id, status);
    if (res.error) {
        showToast("Erreur lors de la validation", "error");
        return false;
    }
    return true;
}
