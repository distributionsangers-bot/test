import { ProfileService } from './profile.service.js';
import { store } from '../../core/store.js';
import { toggleLoader, showToast, escapeHtml } from '../../services/utils.js';
// CORRECTION : Import
import { createIcons, icons } from 'lucide';
import { supabase } from '../../services/supabase.js';

export async function renderProfile(container, params) {
    if (!container) return;

    const currentUserId = store.state.user?.id;
    const targetUserId = params?.id || currentUserId;
    const isMe = (targetUserId === currentUserId);

    container.innerHTML = `
        <div class="animate-pulse max-w-lg mx-auto mt-10 space-y-4">
            <div class="h-32 bg-slate-200 rounded-3xl"></div>
            <div class="h-10 bg-slate-200 rounded-xl w-1/2 mx-auto"></div>
            <div class="h-64 bg-slate-100 rounded-3xl"></div>
        </div>
    `;

    const { profile, history, error } = await ProfileService.getProfileAndHistory(targetUserId);

    if (error || !profile) {
        container.innerHTML = `<div class="text-center text-red-500 py-20 font-bold">Impossible de charger le profil.</div>`;
        return;
    }

    const fullName = escapeHtml(`${profile.first_name || ''} ${profile.last_name || ''}`);
    const email = escapeHtml(profile.email || '');
    const initial = (profile.first_name || '?')[0].toUpperCase();
    const isMandatory = profile.mandatory_hours;
    const hours = profile.total_hours || 0;
    const hasPermit = profile.has_permit;
    const roleBadge = profile.is_admin
        ? `<div class="absolute bottom-0 right-0 bg-yellow-400 text-yellow-900 p-1.5 rounded-full border-4 border-white shadow-sm"><i data-lucide="shield" class="w-4 h-4"></i></div>`
        : '';

    let statusBadge = '';
    if (profile.status === 'pending') statusBadge = '<span class="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-sm font-bold">En attente</span>';
    else if (profile.status === 'approved') statusBadge = '<span class="px-2 py-1 rounded bg-green-100 text-green-800 text-sm font-bold">Validé</span>';
    else statusBadge = '<span class="px-2 py-1 rounded bg-red-100 text-red-800 text-sm font-bold">Refusé</span>';

    container.innerHTML = `
        <div class="animate-slide-up max-w-lg mx-auto pb-24 space-y-5">
            <div class="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 text-center relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-brand-50 to-white"></div>
                <div class="relative z-10">
                    <div class="relative w-24 h-24 mx-auto mb-3">
                        <div class="w-full h-full bg-white text-brand-600 rounded-full flex items-center justify-center text-3xl font-extrabold shadow-lg border-4 border-white">
                            ${initial}
                        </div>
                        ${roleBadge}
                    </div>
                    <h2 class="text-xl font-extrabold text-slate-900">${fullName}</h2>
                    <p class="text-slate-400 font-medium text-sm mb-5">${email}</p>
                    <div class="flex justify-center gap-3 flex-wrap">
                        <div class="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Statut</div>
                            ${statusBadge}
                        </div>
                        <div class="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Permis</div>
                            <div class="font-bold ${hasPermit ? 'text-green-600' : 'text-slate-400'} text-sm">${hasPermit ? 'Oui' : 'Non'}</div>
                        </div>
                        <div class="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                             <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Type</div>
                             <div class="font-bold text-brand-600 text-sm">${isMandatory ? 'Scolaire' : 'Bénévole'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-6 text-white shadow-lg shadow-emerald-200 relative overflow-hidden flex items-center justify-between">
                <div class="relative z-10">
                    <p class="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Compteur Heures</p>
                    <p class="text-5xl font-extrabold tracking-tighter">${hours}<span class="text-2xl opacity-60 ml-1">h</span></p>
                </div>
                <i data-lucide="award" class="w-24 h-24 text-white opacity-20 absolute -right-4 -bottom-4 rotate-12"></i>
            </div>

            <div class="mt-6">
                <div class="flex p-1 bg-slate-100 rounded-xl mb-4">
                    <button id="tab-history" class="flex-1 py-2 rounded-lg text-sm font-bold bg-white text-slate-900 shadow-sm transition">Historique</button>
                    ${isMe ? `<button id="tab-edit" class="flex-1 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 transition">Modifier</button>` : ''}
                    <button id="tab-qr" class="flex-1 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 transition">QR Code</button>
                </div>

                <div id="content-history" class="space-y-3">
                    ${renderHistoryList(history)}
                </div>

                ${isMe ? `
                <div id="content-edit" class="hidden bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <h3 class="font-bold text-lg mb-4">Mes Informations</h3>
                    <form id="form-profile-update" class="space-y-4">
                        <div>
                            <label class="text-xs font-bold text-slate-400 uppercase ml-1">Téléphone</label>
                            <input name="phone" value="${profile.phone || ''}" type="tel" class="w-full p-3 bg-slate-50 rounded-xl font-bold border outline-none focus:ring-2 focus:ring-brand-500" placeholder="06...">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-400 uppercase ml-1">Nouveau Mot de passe (optionnel)</label>
                            <input name="password" type="password" class="w-full p-3 bg-slate-50 rounded-xl font-bold border outline-none focus:ring-2 focus:ring-brand-500" placeholder="********">
                        </div>
                        <button type="submit" class="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition">Enregistrer</button>
                    </form>
                    
                    <div class="pt-6 mt-6 border-t border-slate-100">
                        <button id="btn-delete-account" class="w-full py-3 border border-red-100 text-red-500 font-bold rounded-xl hover:bg-red-50 transition text-xs flex items-center justify-center gap-2">
                             <i data-lucide="trash-2" class="w-4 h-4"></i> Supprimer mon compte
                        </button>
                    </div>
                </div>` : ''}

                <div id="content-qr" class="hidden flex flex-col items-center justify-center py-10 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                    <p class="text-sm font-bold text-slate-500 mb-4">Votre Code Bénévole</p>
                    <div id="my-qrcode" class="p-4 bg-white rounded-xl shadow-inner border border-slate-100 mb-4">
                        <div class="w-40 h-40 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs text-center p-2">
                            QR Code généré ici automatiquement
                        </div>
                    </div>
                    <p class="text-xs text-slate-400 max-w-xs text-center">Présentez ce code aux responsables pour valider vos missions.</p>
                </div>
            </div>
        </div>
    `;

    // CORRECTION : Injection globale
    createIcons({ icons, root: container });

    setupTabs(container);

    if (isMe) {
        setupEditForm(container, profile.id);
        setupDelete(container, profile.id);
    }
}

function renderHistoryList(history) {
    if (!history || history.length === 0) {
        return `<div class="text-center py-10 text-slate-400 font-medium bg-white rounded-2xl border border-slate-100">Aucune mission pour le moment.</div>`;
    }

    return history.map(item => {
        const shift = item.shifts;
        const event = shift?.events;
        if (!shift || !event) return '';

        const date = new Date(event.date);
        const isPast = new Date() > new Date(`${event.date}T${shift.end_time}`);
        const isPresent = item.status === 'present';
        const isAbsent = item.status === 'absent';

        let statusColor = 'border-slate-100 bg-white';
        let icon = 'calendar';
        let iconColor = 'text-slate-400';

        if (isPresent) {
            statusColor = 'border-green-200 bg-green-50';
            icon = 'check-circle-2';
            iconColor = 'text-green-600';
        } else if (isAbsent) {
            statusColor = 'border-red-200 bg-red-50';
            icon = 'x-circle';
            iconColor = 'text-red-500';
        } else if (!isPast) {
            statusColor = 'border-blue-100 bg-blue-50/50';
            icon = 'clock';
            iconColor = 'text-blue-500';
        } else {
            statusColor = 'border-orange-200 bg-orange-50';
            icon = 'help-circle';
            iconColor = 'text-orange-500';
        }

        return `
            <div class="flex items-center gap-4 p-4 rounded-2xl border ${statusColor} shadow-sm animate-fade-in">
                <div class="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex-shrink-0">
                    <i data-lucide="${icon}" class="w-6 h-6 ${iconColor}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-900 text-sm truncate">${escapeHtml(event.title)}</h4>
                    <div class="text-xs text-slate-500 truncate">${shift.title} • ${date.toLocaleDateString()}</div>
                </div>
                ${item.hours_added ? `<div class="text-xs font-bold text-green-600 bg-white px-2 py-1 rounded-lg border border-green-100 shadow-sm">+${item.hours_added}h</div>` : ''}
            </div>
        `;
    }).join('');
}

function setupTabs(c) {
    const tabs = ['history', 'edit', 'qr'];
    tabs.forEach(t => {
        const btn = c.querySelector(`#tab-${t}`);
        if (!btn) return;
        btn.addEventListener('click', () => {
            tabs.forEach(x => {
                const b = c.querySelector(`#tab-${x}`);
                const content = c.querySelector(`#content-${x}`);
                if (b) b.className = "flex-1 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 transition";
                if (content) content.classList.add('hidden');
            });
            btn.className = "flex-1 py-2 rounded-lg text-sm font-bold bg-white text-slate-900 shadow-sm transition";
            c.querySelector(`#content-${t}`).classList.remove('hidden');
        });
    });
}

function setupEditForm(c, uid) {
    const form = c.querySelector('#form-profile-update');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const data = { phone: fd.get('phone'), password: fd.get('password') };
        toggleLoader(true);
        const res = await ProfileService.updateProfile(uid, data);
        toggleLoader(false);
        if (res.error) showToast("Erreur mise à jour", "error");
        else {
            showToast("Infos mises à jour avec succès");
            if (data.password) form.querySelector('[name=password]').value = '';
        }
    });
}

function setupDelete(c, uid) {
    const btn = c.querySelector('#btn-delete-account');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const m = document.createElement('div');
        m.id = 'delete-account-modal';
        m.className = 'fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';
        m.innerHTML = `
            <div class="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-slide-up relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-orange-500"></div>
                <div class="text-center">
                    <div class="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-100 shadow-sm">
                        <i data-lucide="alert-triangle" class="w-10 h-10"></i>
                    </div>
                    <h3 class="text-xl font-extrabold text-slate-900 mb-2">Supprimer le compte ?</h3>
                    <p class="text-sm text-slate-500 mb-6 leading-relaxed">Cette action est <span class="font-bold text-red-500">irréversible</span>. Toutes vos données seront effacées.</p>
                    <div class="bg-slate-50 p-4 rounded-xl text-left border border-slate-200 mb-6">
                        <label class="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Confirmez votre email</label>
                        <input id="delete-confirm-email" type="email" placeholder="${store.state.user?.email || ''}" class="w-full p-3 bg-white rounded-lg font-bold text-sm outline-none border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition placeholder:text-slate-300">
                    </div>
                    <div class="flex gap-3">
                        <button id="btn-cancel-delete" class="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">Annuler</button>
                        <button id="btn-confirm-delete" class="flex-1 py-3.5 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition flex items-center justify-center gap-2">
                             <i data-lucide="trash-2" class="w-4 h-4"></i> Supprimer
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(m);
        // CORRECTION : Injection dans la modale
        createIcons({ icons, root: m });

        m.querySelector('#btn-cancel-delete').addEventListener('click', () => m.remove());
        m.querySelector('#btn-confirm-delete').addEventListener('click', async () => {
            const input = m.querySelector('#delete-confirm-email');
            if (input.value.trim() !== store.state.user?.email) {
                input.classList.add('ring-2', 'ring-red-500', 'bg-red-50');
                return;
            }
            toggleLoader(true);
            const res = await ProfileService.deleteAccount(uid);
            if (res.error) {
                toggleLoader(false);
                showToast("Erreur: " + res.error.message, "error");
            } else {
                await supabase.auth.signOut();
                window.location.reload();
            }
            m.remove();
        });
    });
}

export function initProfile() { }
