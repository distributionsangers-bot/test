import { DirectoryService } from './directory.service.js';
import { toggleLoader, showToast, escapeHtml } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { store } from '../../core/store.js'; // To check current user for security

export async function renderDirectory(container) {
    if (!container) return;

    // Skeleton
    container.innerHTML = `
        <div class="space-y-4 animate-pulse">
            <div class="h-10 bg-slate-200 rounded-xl w-1/3 mb-6"></div>
            <div class="h-12 bg-slate-100 rounded-xl w-full"></div>
            <div class="h-12 bg-slate-100 rounded-xl w-full"></div>
            <div class="h-12 bg-slate-100 rounded-xl w-full"></div>
        </div>
    `;

    // State
    const state = {
        page: 1,
        limit: 10,
        search: '',
        filter: 'all', // all, pending, admin
        total: 0
    };

    const loadUsers = async () => {
        const listContainer = document.getElementById('directory-list');
        const paginationContainer = document.getElementById('directory-pagination');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div class="space-y-4 animate-pulse">
                <div class="h-16 bg-slate-50 rounded-2xl w-full border border-slate-100"></div>
                <div class="h-16 bg-slate-50 rounded-2xl w-full border border-slate-100"></div>
                <div class="h-16 bg-slate-50 rounded-2xl w-full border border-slate-100"></div>
            </div>
        `;

        const { data, count, error } = await DirectoryService.getUsers(state.page, state.limit, state.search, state.filter);

        if (error) {
            listContainer.innerHTML = `<div class="text-center text-red-500 py-10 font-bold">Erreur de chargement.</div>`;
            return;
        }

        state.total = count || 0;
        const totalPages = Math.ceil(state.total / state.limit);

        if (data.length === 0) {
            listContainer.innerHTML = `<div class="text-center py-10 text-slate-400 font-medium bg-white rounded-2xl border border-slate-100">Aucun résultat trouvé.</div>`;
            renderPagination(paginationContainer, totalPages);
            return;
        }

        listContainer.innerHTML = data.map(u => {
            const isMe = u.id === currentUserId;
            const fullName = escapeHtml(`${u.first_name || ''} ${u.last_name || ''}`);
            const initial = (u.first_name || '?')[0].toUpperCase();
            const isAdmin = u.is_admin;
            const isApproved = u.status === 'approved';

            let badges = '';
            if (isAdmin) badges += `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200 uppercase mr-1">Admin</span>`;
            else badges += `<span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 uppercase mr-1">Bénévole</span>`;

            if (u.status === 'pending') badges += `<span class="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-200 uppercase">En attente</span>`;

            const deleteBtn = isMe ? '' : `
                <button data-action="delete" data-id="${u.id}" aria-label="Supprimer utilisateur" class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition" title="Supprimer">
                    <i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i>
                </button>`;

            const adminToggle = isMe ? '' : `
                <button data-action="toggle-admin" data-id="${u.id}" data-is-admin="${isAdmin}" aria-label="${isAdmin ? 'Retirer Admin' : 'Passer Admin'}" class="p-2 rounded-xl transition ${isAdmin ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-slate-300 hover:text-red-500 hover:bg-slate-50'}" title="${isAdmin ? 'Retirer Admin' : 'Passer Admin'}">
                    <i data-lucide="shield" class="w-5 h-5 pointer-events-none ${isAdmin ? 'fill-current' : ''}"></i>
                </button>`;

            const statusToggle = `
                <button data-action="toggle-status" data-id="${u.id}" data-status="${u.status}" aria-label="${isApproved ? 'Désactiver compte' : 'Valider compte'}" class="p-2 rounded-xl transition ${isApproved ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-slate-300 hover:text-green-500 hover:bg-slate-50'}" title="${isApproved ? 'Désactiver' : 'Valider'}">
                    <i data-lucide="check-circle-2" class="w-5 h-5 pointer-events-none ${isApproved ? 'fill-current' : ''}"></i>
                </button>`;

            return `
                <div class="user-row bg-white p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in hover:shadow-sm transition group">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg uppercase border-2 border-white shadow-sm shrink-0">
                            ${initial}
                        </div>
                        <div>
                            <div class="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                                ${fullName}
                                <div class="flex">${badges}</div>
                            </div>
                            <div class="text-xs text-slate-400 font-medium">${escapeHtml(u.email)}</div>
                            <div class="text-[10px] text-slate-300 mt-0.5">Inscrit le ${new Date(u.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 self-end sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto justify-end border-slate-50">
                        ${statusToggle}
                        ${adminToggle}
                        <div class="w-px h-4 bg-slate-200 mx-1"></div>
                        ${deleteBtn}
                    </div>
                </div>
            `;
        }).join('');

        createIcons({ icons, root: listContainer });
        renderPagination(paginationContainer, totalPages);
    };

    const renderPagination = (container, totalPages) => {
        if (!container) return;
        if (state.total === 0) {
            container.innerHTML = '';
            return;
        }

        const start = (state.page - 1) * state.limit + 1;
        const end = Math.min(state.page * state.limit, state.total);

        container.innerHTML = `
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-100">
                <div class="text-xs font-bold text-slate-400">
                    Affichage ${start}-${end} sur ${state.total} bénévoles
                </div>
                <div class="flex items-center gap-2">
                    <button id="btn-prev" ${state.page === 1 ? 'disabled' : ''} class="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition">
                        <i data-lucide="chevron-left" class="w-5 h-5"></i>
                    </button>
                    <span class="text-sm font-bold text-slate-700 min-w-[3rem] text-center">Page ${state.page} / ${totalPages || 1}</span>
                    <button id="btn-next" ${state.page >= totalPages ? 'disabled' : ''} class="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition">
                        <i data-lucide="chevron-right" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        `;
        createIcons({ icons, root: container });

        const btnPrev = container.querySelector('#btn-prev');
        const btnNext = container.querySelector('#btn-next');

        if (btnPrev) btnPrev.addEventListener('click', () => {
            if (state.page > 1) {
                state.page--;
                loadUsers();
            }
        });

        if (btnNext) btnNext.addEventListener('click', () => {
            if (state.page < totalPages) {
                state.page++;
                loadUsers();
            }
        });
    };

    // Main Layout
    container.innerHTML = `
        <div class="pb-24 max-w-5xl mx-auto">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-extrabold text-slate-900">Annuaire</h2>
                    <p class="text-slate-500 text-sm">Gérez les bénévoles et leurs rôles.</p>
                </div>
                
                <div class="relative w-full md:w-auto min-w-[300px]">
                    <i data-lucide="search" class="absolute left-4 top-3.5 w-5 h-5 text-slate-400"></i>
                    <input type="text" id="directory-search" placeholder="Rechercher par nom, email..." class="w-full pl-12 pr-4 py-3 bg-white rounded-xl shadow-sm border border-slate-100 outline-none font-bold text-sm focus:ring-2 focus:ring-brand-500 transition">
                </div>
            </div>

            <div class="flex gap-2 overflow-x-auto no-scrollbar mb-6">
                <button data-filter="all" class="filter-btn active px-4 py-2 rounded-xl text-xs font-bold transition bg-slate-900 text-white shadow-lg">Tous</button>
                <button data-filter="pending" class="filter-btn px-4 py-2 rounded-xl text-xs font-bold transition bg-white text-slate-500 border border-slate-100 hover:bg-slate-50">En attente</button>
                <button data-filter="admin" class="filter-btn px-4 py-2 rounded-xl text-xs font-bold transition bg-white text-slate-500 border border-slate-100 hover:bg-slate-50">Admins</button>
            </div>

            <div id="directory-list" class="space-y-3 min-h-[300px]">
                <!-- List content -->
            </div>
            
            <div id="directory-pagination">
                <!-- Pagination Controls -->
            </div>
        </div>
    `;

    // Init
    loadUsers();

    // Event Listeners
    const searchInput = container.querySelector('#directory-search');
    let timeoutId;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            state.search = e.target.value.trim();
            state.page = 1; // Reset to page 1 on search
            loadUsers();
        }, 500); // 500ms debounce for server query
    });

    const filterBtns = container.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.className = 'filter-btn px-4 py-2 rounded-xl text-xs font-bold transition bg-white text-slate-500 border border-slate-100 hover:bg-slate-50';
            });
            btn.className = 'filter-btn active px-4 py-2 rounded-xl text-xs font-bold transition bg-slate-900 text-white shadow-lg';

            state.filter = btn.dataset.filter;
            state.page = 1; // Reset to page 1
            loadUsers();
        });
    });

    // Action Delegation
    const listContainer = container.querySelector('#directory-list');
    listContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;
        // Actions (toggle-status, delete, etc.) remain mostly same but need to reload current page
        // to reflect changes or remove item.

        if (action === 'toggle-status') {
            const currentStatus = btn.dataset.status;
            const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
            toggleLoader(true);
            const res = await DirectoryService.updateUserStatus(id, newStatus);
            toggleLoader(false);

            if (res.error) showToast("Erreur modification statut", "error");
            else {
                showToast(`Utilisateur ${newStatus === 'approved' ? 'validé' : 'désactivé'}`);
                loadUsers(); // Reload to update UI state properly
            }
        }
        else if (action === 'toggle-admin') {
            const isAdmin = btn.dataset.isAdmin === 'true';
            const newAdmin = !isAdmin;
            if (!confirm(`Confirmer ${newAdmin ? 'donner' : 'retirer'} les droits Admin ?`)) return;

            toggleLoader(true);
            const res = await DirectoryService.updateUserRole(id, newAdmin);
            toggleLoader(false);

            if (res.error) showToast("Erreur droits admin", "error");
            else {
                showToast(`Droits mis à jour`);
                loadUsers();
            }
        }
        else if (action === 'delete') {
            if (!confirm("Supprimer définitivement cet utilisateur ?")) return;
            toggleLoader(true);
            const res = await DirectoryService.deleteUserProfile(id);
            toggleLoader(false);

            if (res.error) showToast("Erreur suppression", "error");
            else {
                showToast("Utilisateur supprimé");
                loadUsers();
            }
        }
    });

}

export function cleanup() {
    // No specific cleanup needed as container is managed by router
}
