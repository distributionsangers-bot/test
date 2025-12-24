import { PolesService } from './poles.service.js';
import { store } from '../../core/store.js';
import { toggleLoader, showToast, escapeHtml } from '../../services/utils.js';
import { createIcons } from 'lucide';

export async function renderPoles(container) {
    if (!container) return;

    // 1. Fetch Data
    const [teams, leaders, myInterests] = await Promise.all([
        PolesService.getAllTeams(),
        PolesService.getLeaders(),
        store.state.user ? PolesService.getMyInterests(store.state.user.id) : []
    ]);

    const isViewAdmin = store.state.adminMode && store.state.profile?.is_admin;

    // 2. Render Template
    const renderTeams = () => {
        if (!teams || teams.length === 0) {
            return `<div class="col-span-2 text-center py-20 text-slate-400">Aucun pôle actif.</div>`;
        }

        return teams.map(t => {
            const intr = myInterests.includes(t.id);
            const teamLeaders = leaders ? leaders.filter(l => l.pole_id === t.id) : [];

            const adminActions = isViewAdmin ? `
                <div class="absolute top-4 right-4 flex gap-2 z-10 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl shadow-sm border border-slate-100">
                    <button data-action="view-candidates" data-id="${t.id}" data-name="${escapeHtml(t.name)}" class="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition relative group" title="Voir les intéressés">
                        <i data-lucide="list-filter" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                    <div class="w-px h-6 bg-slate-200 mx-1"></div>
                    <button data-action="edit-pole" data-id="${t.id}" class="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition" title="Modifier">
                        <i data-lucide="pencil" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                    <button data-action="delete-pole" data-id="${t.id}" class="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Supprimer">
                        <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                </div>
            ` : '';

            // Leaders HTML
            const leadersHtml = teamLeaders.length > 0 ? `
                <div class="space-y-2 mb-5">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Responsables</p>
                    <div class="flex flex-wrap gap-2">
                        ${teamLeaders.map(l => `
                            <div class="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
                                <div class="w-5 h-5 bg-gradient-to-br from-brand-400 to-brand-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                                    ${l.first_name[0]}
                                </div>
                                <div class="text-xs">
                                    <span class="font-bold text-slate-800">${escapeHtml(l.first_name)}</span>
                                    <span class="text-slate-500 hidden sm:inline">• ${escapeHtml(l.role_title || '')}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : '<div class="mb-5 text-xs text-slate-300 italic flex items-center gap-1"><i data-lucide="info" class="w-3 h-3"></i> Aucun responsable assigné.</div>';

            return `
                <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-4 animate-fade-in relative overflow-hidden group hover:shadow-md transition-all">
                    ${adminActions}
                    <div class="flex justify-between items-start mb-4 pr-24"> 
                        <div class="flex items-center gap-3">
                            <div class="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <i data-lucide="${t.icon || 'users'}" class="w-7 h-7"></i>
                            </div>
                            <div>
                                <h3 class="font-bold text-lg text-slate-900 leading-tight">${escapeHtml(t.name)}</h3>
                                <p class="text-xs text-slate-400 font-medium">${teamLeaders.length} responsable(s)</p>
                            </div>
                        </div>
                    </div>
                    <p class="text-sm text-slate-600 mb-5 bg-slate-50 p-4 rounded-xl leading-relaxed">
                        ${escapeHtml(t.description || 'Aucune description.')}
                    </p>
                    ${leadersHtml}
                    <button data-action="toggle-interest" data-id="${t.id}" data-interested="${intr}" class="w-full py-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${intr ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-900 text-white shadow-lg hover:bg-slate-800 active:scale-95'}">
                        ${intr ? '<i data-lucide="check" class="w-4 h-4"></i> Intéressé(e)' : 'Rejoindre ce pôle'}
                    </button>
                </div>
            `;
        }).join('');
    };

    const createBtn = isViewAdmin
        ? `<button id="btn-create-pole" class="bg-brand-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-brand-200 hover:scale-110 transition"><i data-lucide="plus" class="w-5 h-5"></i></button>`
        : '';

    container.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <div>
                <h2 class="text-2xl font-extrabold text-slate-900">Pôles & Équipes</h2>
                <p class="text-slate-500 text-sm">Découvrez les différents rôles.</p>
            </div>
            ${createBtn}
        </div>
        <div id="poles-grid" class="pb-24 grid md:grid-cols-2 gap-4">
            ${renderTeams()}
        </div>
    `;

    createIcons({ root: container });

    // 3. Event Handling
    container.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'toggle-interest') {
            const isInterested = btn.dataset.interested === 'true';
            toggleLoader(true);
            try {
                await PolesService.toggleInterest(store.state.user.id, id, isInterested);
                showToast(isInterested ? 'Intérêt retiré' : 'Intérêt signalé aux admins !');
                // Refresh full view to update state
                // Ideally we update local state and re-render partial, but here we reload view logic
                await renderPoles(container);
            } catch (err) {
                console.error(err);
                showToast("Erreur connexion", "error");
                toggleLoader(false);
            }
        } else if (action === 'delete-pole') {
            if (!confirm("Supprimer ce pôle ?")) return;
            toggleLoader(true);
            try {
                await PolesService.deleteTeam(id);
                showToast("Pôle supprimé");
                await renderPoles(container);
            } catch (err) {
                showToast("Erreur suppression", "error");
                toggleLoader(false);
            }
        } else if (action === 'view-candidates') {
            const name = btn.dataset.name;
            await viewPoleCandidates(id, name);
        } else if (action === 'edit-pole') {
            const team = teams.find(t => t.id == id);
            if (team) openEditPoleModal(team, async () => await renderPoles(container));
        } else if (btn.id === 'btn-create-pole') {
            openCreatePoleModal(async () => await renderPoles(container));
        }
    });

}

// --- Modals ---

async function viewPoleCandidates(teamId, teamName) {
    toggleLoader(true);
    const candidates = await PolesService.getCandidates(teamId);
    toggleLoader(false);

    const m = document.createElement('div');
    m.className = 'fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';

    const listHtml = candidates.length > 0 ? candidates.map(c => {
        const p = c.profiles;
        const date = new Date(c.created_at).toLocaleDateString('fr-FR');
        return `
            <div class="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between mb-3 shadow-sm">
                 <div>
                    <div class="flex items-center gap-2">
                        <div class="font-bold text-slate-900">${escapeHtml(p.first_name)} ${escapeHtml(p.last_name)}</div>
                        ${p.status === 'pending' ? '<span class="w-2 h-2 bg-orange-400 rounded-full" title="En attente validation"></span>' : ''}
                    </div>
                    <div class="text-xs text-slate-500 flex gap-3 mt-1">
                        <span><i data-lucide="calendar" class="w-3 h-3 inline"></i> ${date}</span>
                        <span><i data-lucide="phone" class="w-3 h-3 inline"></i> ${escapeHtml(p.phone || '-')}</span>
                    </div>
                </div>
            </div>`;
    }).join('') : `<div class="text-center py-10 text-slate-400 italic">Aucun candidat pour le moment.</div>`;

    m.innerHTML = `
        <div class="bg-slate-50 w-full max-w-md rounded-[2rem] p-6 h-[70vh] flex flex-col shadow-2xl animate-slide-up relative">
            <button class="absolute top-5 right-5 bg-white p-2 rounded-full shadow-sm hover:bg-slate-100 transition text-slate-500 btn-close">
                <i data-lucide="x" class="w-5 h-5 pointer-events-none"></i>
            </button>
            <div class="mb-6">
                <div class="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">Recrutement</div>
                <h3 class="text-xl font-extrabold text-slate-900">Intéressés par : ${teamName}</h3>
            </div>
            <div class="flex-1 overflow-y-auto no-scrollbar space-y-1 pr-1">
                ${listHtml}
            </div>
        </div>
    `;

    document.body.appendChild(m);
    createIcons({ root: m });

    m.querySelector('.btn-close').onclick = () => m.remove();
}

function openCreatePoleModal(onSuccess) {
    const m = document.createElement('div');
    m.className = 'fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';
    m.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-extrabold text-xl text-slate-900">Nouveau Pôle</h3>
                <button class="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition btn-close">
                    <i data-lucide="x" class="w-5 h-5 pointer-events-none"></i>
                </button>
            </div>
            <form id="form-create-pole" class="space-y-4">
                <input name="name" placeholder="Nom (Ex: Logistique)" class="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-brand-500" required>
                <textarea name="desc" rows="2" placeholder="Description..." class="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-brand-500"></textarea>
                <div>
                     <label class="text-xs font-bold text-slate-400 uppercase ml-1 block mb-1">Icône (Lucide)</label>
                     <input name="icon" value="users" class="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-brand-500">
                </div>
                <button type="submit" class="w-full py-3.5 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition mt-2">Créer le pôle</button>
            </form>
        </div>
    `;
    document.body.appendChild(m);
    createIcons({ root: m });

    m.querySelector('.btn-close').onclick = () => m.remove();
    m.querySelector('#form-create-pole').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        toggleLoader(true);
        try {
            await PolesService.createTeam({
                name: fd.get('name'),
                description: fd.get('desc'),
                icon: fd.get('icon')
            });
            showToast('Pôle créé !');
            m.remove();
            if (onSuccess) onSuccess();
        } catch (err) {
            showToast(err.message || "Erreur création", "error");
        } finally {
            toggleLoader(false);
        }
    };
}

function openEditPoleModal(team, onSuccess) {
    const m = document.createElement('div');
    m.className = 'fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';
    m.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-extrabold text-xl text-slate-900">Modifier le Pôle</h3>
                <button class="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition btn-close">
                    <i data-lucide="x" class="w-5 h-5 pointer-events-none"></i>
                </button>
            </div>
            <form id="form-edit-pole" class="space-y-4">
                <input name="name" value="${escapeHtml(team.name)}" class="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-brand-500" required>
                <textarea name="desc" rows="3" class="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-brand-500">${escapeHtml(team.description || '')}</textarea>
                <div>
                     <label class="text-xs font-bold text-slate-400 uppercase ml-1 block mb-1">Icône</label>
                     <input name="icon" value="${escapeHtml(team.icon || 'users')}" class="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-brand-500">
                </div>
                <button type="submit" class="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition mt-2">Enregistrer</button>
            </form>
        </div>
    `;
    document.body.appendChild(m);
    createIcons({ root: m });

    m.querySelector('.btn-close').onclick = () => m.remove();
    m.querySelector('#form-edit-pole').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        toggleLoader(true);
        try {
            await PolesService.updateTeam(team.id, {
                name: fd.get('name'),
                description: fd.get('desc'),
                icon: fd.get('icon')
            });
            showToast('Pôle mis à jour !');
            m.remove();
            if (onSuccess) onSuccess();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            toggleLoader(false);
        }
    };
}
