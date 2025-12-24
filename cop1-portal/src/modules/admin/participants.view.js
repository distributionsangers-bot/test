
import { ParticipantsService } from './participants.service.js';
import { showToast, toggleLoader } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';

async function togglePresence(regId, isPresent) {
    const { error } = await ParticipantsService.updateAttendance(regId, isPresent);
    if (error) {
        showToast("Erreur mise à jour présence", "error");
    } else {
        showToast(isPresent ? 'Présence validée' : 'Présence annulée');
    }
}

async function forceUnsubscribe(regId, rowElement) {
    if (!confirm('Êtes-vous sûr de vouloir désinscrire ce bénévole ?')) return;

    toggleLoader(true);
    const { error } = await ParticipantsService.deleteRegistration(regId);
    toggleLoader(false);

    if (error) {
        showToast("Erreur désinscription", "error");
    } else {
        showToast("Bénévole désinscrit");
        if (rowElement) rowElement.remove();
    }
}

export async function openParticipantsModal(shiftId, title) {
    console.log("Ouverture participants pour", shiftId);

    toggleLoader(true);
    const { data: regs, error } = await ParticipantsService.getShiftRegistrations(shiftId);
    toggleLoader(false);

    if (error) {
        showToast("Erreur récupération participants", "error");
        return;
    }

    const m = document.createElement('div');
    m.className = 'fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';

    const listHtml = regs.map(r => `
        <div class="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center mb-2 shadow-sm">
            <div>
                <div class="font-bold text-slate-900">${r.profiles.first_name} ${r.profiles.last_name}</div>
                <div class="text-xs text-slate-400">${r.profiles.phone || 'Pas de tel'}</div>
            </div>
            <div class="flex items-center gap-3">
                <label class="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                    <input type="checkbox" ${r.attended ? 'checked' : ''} data-reg-id="${r.id}" class="presence-check w-4 h-4 text-green-600 rounded focus:ring-green-500">
                    <span class="text-xs font-bold text-slate-600">Présent</span>
                </label>
                <button data-action="force-unsubscribe" data-reg-id="${r.id}" class="bg-red-50 text-red-500 p-2 rounded-xl hover:bg-red-100" title="Désinscrire">
                    <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                </button>
            </div>
        </div>
    `).join('');

    m.innerHTML = `
        <div class="bg-slate-50 w-full max-w-lg rounded-3xl p-6 h-[80vh] flex flex-col shadow-2xl animate-slide-up relative">
            <button id="close-participants-btn" class="absolute top-5 right-5 bg-white p-2 rounded-full shadow-sm hover:bg-slate-100 transition">
                <i data-lucide="x" class="w-4 h-4 text-slate-500"></i>
            </button>
            
            <h3 class="text-xl font-extrabold text-slate-900 mb-1">${title || 'Participants'}</h3>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-6">${regs.length} inscrit(s)</p>
            
            <div class="flex-1 overflow-y-auto no-scrollbar space-y-2" id="participants-list">
                ${listHtml || '<div class="text-center py-10 text-slate-400">Aucun inscrit pour le moment.</div>'}
            </div>
        </div>
    `;

    document.body.appendChild(m);
    createIcons({ icons, root: m });

    // Event Listeners
    m.querySelector('#close-participants-btn').addEventListener('click', () => m.remove());

    // Event Delegation for list actions
    const list = m.querySelector('#participants-list');

    // Use optional chaining or check if list exists (it should, but good practice)
    if (list) {
        list.addEventListener('change', async (e) => {
            if (e.target.classList.contains('presence-check')) {
                const regId = e.target.dataset.regId;
                const isPresent = e.target.checked;
                await togglePresence(regId, isPresent);
            }
        });

        list.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            if (btn.dataset.action === 'force-unsubscribe') {
                const regId = btn.dataset.regId;
                await forceUnsubscribe(regId, btn.closest('.p-4'));
            }
        });
    }
}

