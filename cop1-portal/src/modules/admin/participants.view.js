/**
 * ============================================
 * PARTICIPANTS VIEW
 * ============================================
 * Modale de gestion des participants à un créneau :
 * - Liste des inscrits
 * - Check-in manuel (présence)
 * - Désinscription forcée
 * - Ajout manuel de participants (NOUVEAU)
 * - Export CSV (NOUVEAU)
 * - Statistiques (NOUVEAU)
 * 
 * RESTAURÉ depuis index_originel.html
 * ============================================
 */

import { ParticipantsService } from './participants.service.js';
import { showToast, toggleLoader, showConfirm } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { supabase } from '../../services/supabase.js';

/**
 * Bascule la présence d'un participant
 * @param {number} regId - ID de l'inscription
 * @param {boolean} isPresent - Présent ou non
 */
async function togglePresence(regId, isPresent) {
    try {
        const { error } = await ParticipantsService.updateAttendance(regId, isPresent);

        if (error) throw error;

        showToast(isPresent ? '✅ Présence validée' : '❌ Présence annulée');
    } catch (error) {
        console.error('❌ Erreur mise à jour présence:', error);
        showToast("Erreur mise à jour présence", "error");
    }
}

/**
 * Désinscrit un participant (admin)
 * @param {number} regId - ID de l'inscription
 * @param {HTMLElement} rowElement - Élément DOM à supprimer
 */
async function forceUnsubscribe(regId, rowElement) {
    showConfirm('Êtes-vous sûr de vouloir désinscrire ce bénévole ?', async () => {
        try {
            toggleLoader(true);
            const { error } = await ParticipantsService.deleteRegistration(regId);

            if (error) throw error;

            showToast("Bénévole désinscrit");
            if (rowElement) rowElement.remove();

            // Met à jour le compteur
            updateParticipantCount();
        } catch (error) {
            console.error('❌ Erreur désinscription:', error);
            showToast("Erreur désinscription", "error");
        } finally {
            toggleLoader(false);
        }
    }, { type: 'danger', confirmText: 'Désinscrire' });
}

/**
 * Exporte la liste des participants en CSV
 * @param {number} shiftId - ID du créneau
 * @param {string} title - Titre du créneau
 */
async function exportParticipantsCSV(shiftId, title) {
    try {
        toggleLoader(true);
        const { csv, error } = await ParticipantsService.exportParticipantsCSV(shiftId);

        if (error) throw error;

        // Télécharge le fichier CSV
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `participants_${title.replace(/\s+/g, '_')}_${Date.now()}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('📥 Export CSV réussi');
    } catch (error) {
        console.error('❌ Erreur export CSV:', error);
        showToast("Erreur export CSV", "error");
    } finally {
        toggleLoader(false);
    }
}

/**
 * Ouvre une modale pour ajouter manuellement un participant
 * @param {number} shiftId - ID du créneau
 * @param {Function} onSuccess - Callback après ajout réussi
 */
async function openAddParticipantModal(shiftId, onSuccess) {
    // Récupère la liste des utilisateurs approuvés
    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('status', 'approved')
        .order('last_name', { ascending: true });

    if (error) {
        showToast("Erreur récupération utilisateurs", "error");
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';

    modal.innerHTML = `
        <div class="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-slide-up">
            <h3 class="text-xl font-extrabold text-slate-900 mb-4">Ajouter un participant</h3>
            
            <div class="mb-4">
                <label class="text-xs font-bold text-slate-400 uppercase mb-2 block">Sélectionner un bénévole</label>
                <select id="user-select" class="w-full p-3 bg-slate-50 rounded-xl font-bold border outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">-- Choisir --</option>
                    ${users.map(u => `<option value="${u.id}">${u.last_name} ${u.first_name} (${u.email})</option>`).join('')}
                </select>
            </div>

            <div class="flex gap-3">
                <button id="btn-add-participant" class="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition">
                    Ajouter
                </button>
                <button id="btn-cancel-add" class="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">
                    Annuler
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('#btn-cancel-add').addEventListener('click', () => modal.remove());

    modal.querySelector('#btn-add-participant').addEventListener('click', async () => {
        const userId = modal.querySelector('#user-select').value;

        if (!userId) {
            showToast("Veuillez sélectionner un bénévole", "warning");
            return;
        }

        try {
            toggleLoader(true);
            const { data, error } = await ParticipantsService.addParticipant(shiftId, userId);

            if (error) throw error;

            showToast('✅ Participant ajouté');
            modal.remove();

            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('❌ Erreur ajout participant:', error);
            showToast(error.message || "Erreur ajout participant", "error");
        } finally {
            toggleLoader(false);
        }
    });
}

/**
 * Met à jour le compteur de participants
 */
function updateParticipantCount() {
    const list = document.getElementById('participants-list');
    const counter = document.getElementById('participants-count');

    if (list && counter) {
        const count = list.querySelectorAll('.p-4.bg-white').length;
        counter.textContent = `${count} inscrit(s)`;
    }
}

/**
 * Ouvre la modale de gestion des participants
 * RESTAURÉ depuis index_originel.html
 * AMÉLIORATIONS : Export CSV, Ajout manuel, Statistiques
 * @param {number} shiftId - ID du créneau
 * @param {string} title - Titre du créneau
 */
export async function openParticipantsModal(shiftId, title) {
    try {
        toggleLoader(true);
        const { data: regs, error } = await ParticipantsService.getShiftRegistrations(shiftId);

        if (error) throw error;

        const listHtml = regs.map(r => `
            <div class="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center mb-2 shadow-sm hover:shadow-md transition">
                <div class="flex-1">
                    <div class="font-bold text-slate-900">${r.profiles.first_name} ${r.profiles.last_name}</div>
                    <div class="text-xs text-slate-400 flex items-center gap-2 mt-1">
                        <i data-lucide="phone" class="w-3 h-3"></i>
                        ${r.profiles.phone || 'Pas de téléphone'}
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <label class="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition">
                        <input 
                            type="checkbox" 
                            ${r.attended ? 'checked' : ''} 
                            data-reg-id="${r.id}" 
                            class="presence-check w-4 h-4 text-green-600 rounded focus:ring-green-500"
                        >
                        <span class="text-xs font-bold text-slate-600">Présent</span>
                    </label>
                    <button 
                        data-action="force-unsubscribe" 
                        data-reg-id="${r.id}" 
                        class="bg-red-50 text-red-500 p-2 rounded-xl hover:bg-red-100 transition active:scale-95"
                        title="Désinscrire"
                        aria-label="Désinscrire ce participant"
                    >
                        <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                </div>
            </div>
        `).join('');

        const m = document.createElement('div');
        m.className = 'fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';

        m.innerHTML = `
            <div class="bg-slate-50 w-full max-w-lg rounded-3xl p-6 h-[80vh] flex flex-col shadow-2xl animate-slide-up relative">
                <button 
                    id="close-participants-btn" 
                    class="absolute top-5 right-5 bg-white p-2 rounded-full shadow-sm hover:bg-slate-100 transition active:scale-95"
                    aria-label="Fermer"
                >
                    <i data-lucide="x" class="w-4 h-4 text-slate-500"></i>
                </button>
                
                <h3 class="text-xl font-extrabold text-slate-900 mb-1">${title || 'Participants'}</h3>
                <p id="participants-count" class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">${regs.length} inscrit(s)</p>
                
                <!-- Actions -->
                <div class="flex gap-2 mb-4">
                    <button 
                        id="btn-add-participant" 
                        class="flex-1 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition active:scale-95 flex items-center justify-center gap-2"
                    >
                        <i data-lucide="user-plus" class="w-4 h-4"></i>
                        Ajouter
                    </button>
                    <button 
                        id="btn-export-csv" 
                        class="flex-1 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition active:scale-95 flex items-center justify-center gap-2"
                    >
                        <i data-lucide="download" class="w-4 h-4"></i>
                        Export CSV
                    </button>
                </div>
                
                <div class="flex-1 overflow-y-auto no-scrollbar space-y-2" id="participants-list">
                    ${listHtml || '<div class="text-center py-10 text-slate-400">Aucun inscrit pour le moment.</div>'}
                </div>
            </div>
        `;

        document.body.appendChild(m);
        createIcons({ icons, root: m });

        // Event Listeners
        m.querySelector('#close-participants-btn').addEventListener('click', () => m.remove());

        m.querySelector('#btn-export-csv').addEventListener('click', () => {
            exportParticipantsCSV(shiftId, title);
        });

        m.querySelector('#btn-add-participant').addEventListener('click', () => {
            openAddParticipantModal(shiftId, () => {
                // Recharge la modale après ajout
                m.remove();
                openParticipantsModal(shiftId, title);
            });
        });

        // Event Delegation for list actions
        const list = m.querySelector('#participants-list');

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
    } catch (error) {
        console.error('❌ Erreur ouverture modale participants:', error);
        showToast("Erreur récupération participants", "error");
    } finally {
        toggleLoader(false);
    }
}
