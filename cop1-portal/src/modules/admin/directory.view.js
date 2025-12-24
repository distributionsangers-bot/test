import { DirectoryService } from './directory.service.js';
import { toggleLoader, showToast, escapeHtml } from '../../services/utils.js';
import { createIcons } from 'lucide';
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

    // Fetch Data
    const { data: users, error } = await DirectoryService.getAllUsers();

    if (error) {
        showToast("Erreur chargement annuaire", "error");
        container.innerHTML = `<div class="text-center text-red-500 py-10">Impossible de charger les utilisateurs.</div>`;
        return;
    }

    // Determine current user ID securely
    const currentUserId = store.state.user?.id; // Assuming store is populated

    // State for filtering
    let searchTerm = '';
    let filterType = 'all'; // all, pending, admin

    const renderList = () => {
        const listContainer = document.getElementById('directory-list');
        if (!listContainer) return;

        // Filter Logic
        let filtered = users.filter(u => {
            const searchLower = searchTerm.toLowerCase();
            const nameMatch = (u.first_name || '').toLowerCase().includes(searchLower) ||
                (u.last_name || '').toLowerCase().includes(searchLower) ||
                (u.email || '').toLowerCase().includes(searchLower);

            if (!nameMatch) return false;

            if (filterType === 'pending') return u.status === 'pending';
            if (filterType === 'admin') return u.is_admin;
            return true;
        });

        if (filtered.length === 0) {
            listContainer.innerHTML = `<div class="text-center py-10 text-slate-400 font-medium">Aucun résultat trouvé.</div>`;
            return;
        }

        listContainer.innerHTML = filtered.map(u => {
            const isMe = u.id === currentUserId;
            const fullName = escapeHtml(`${u.first_name || ''} ${u.last_name || ''}`);
            const initial = (u.first_name || '?')[0].toUpperCase();
            const isAdmin = u.is_admin;
            const isApproved = u.status === 'approved';

            // Badges
            let badges = '';
            if (isAdmin) badges += `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200 uppercase mr-1">Admin</span>`;
            else badges += `<span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 uppercase mr-1">Bénévole</span>`;

            if (u.status === 'pending') badges += `<span class="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-200 uppercase">En attente</span>`;

            // Actions
            // Can't delete self or change own admin status
            const deleteBtn = isMe ? '' : `
                <button data-action="delete" data-id="${u.id}" class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition" title="Supprimer">
                    <i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i>
                </button>`;

            const adminToggle = isMe ? '' : `
                <button data-action="toggle-admin" data-id="${u.id}" data-is-admin="${isAdmin}" class="p-2 rounded-xl transition ${isAdmin ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-slate-300 hover:text-red-500 hover:bg-slate-50'}" title="${isAdmin ? 'Retirer Admin' : 'Passer Admin'}">
                    <i data-lucide="shield" class="w-5 h-5 pointer-events-none ${isAdmin ? 'fill-current' : ''}"></i>
                </button>`;

            const statusToggle = `
                <button data-action="toggle-status" data-id="${u.id}" data-status="${u.status}" class="p-2 rounded-xl transition ${isApproved ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-slate-300 hover:text-green-500 hover:bg-slate-50'}" title="${isApproved ? 'Désactiver' : 'Valider'}">
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

        createIcons({ root: listContainer });
    };

    // Main Layout
    container.innerHTML = `
        <div class="pb-24 max-w-5xl mx-auto">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-extrabold text-slate-900">Annuaire</h2>
                    <p class="text-slate-500 text-sm">Gérez les ${users.length} bénévoles et leurs rôles.</p>
                </div>
                
                <div class="relative w-full md:w-auto min-w-[300px]">
                    <i data-lucide="search" class="absolute left-4 top-3.5 w-5 h-5 text-slate-400"></i>
                    <input type="text" id="directory-search" placeholder="Rechercher un bénévole..." class="w-full pl-12 pr-4 py-3 bg-white rounded-xl shadow-sm border border-slate-100 outline-none font-bold text-sm focus:ring-2 focus:ring-brand-500 transition">
                </div>
            </div>

            <div class="flex gap-2 overflow-x-auto no-scrollbar mb-6">
                <button data-filter="all" class="filter-btn active px-4 py-2 rounded-xl text-xs font-bold transition bg-slate-900 text-white shadow-lg">Tous</button>
                <button data-filter="pending" class="filter-btn px-4 py-2 rounded-xl text-xs font-bold transition bg-white text-slate-500 border border-slate-100 hover:bg-slate-50">En attente</button>
                <button data-filter="admin" class="filter-btn px-4 py-2 rounded-xl text-xs font-bold transition bg-white text-slate-500 border border-slate-100 hover:bg-slate-50">Admins</button>
            </div>

            <div id="directory-list" class="space-y-3">
                <!-- List content -->
            </div>
        </div>
    `;

    createIcons({ root: container });
    renderList();

    // Event Listeners
    const searchInput = container.querySelector('#directory-search');
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderList();
    });

    const filterBtns = container.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Update
            filterBtns.forEach(b => {
                b.className = 'filter-btn px-4 py-2 rounded-xl text-xs font-bold transition bg-white text-slate-500 border border-slate-100 hover:bg-slate-50';
            });
            btn.className = 'filter-btn active px-4 py-2 rounded-xl text-xs font-bold transition bg-slate-900 text-white shadow-lg';

            // Logic Update
            filterType = btn.dataset.filter;
            renderList();
        });
    });

    // Action Delegation
    const listContainer = container.querySelector('#directory-list');
    listContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'toggle-status') {
            const currentStatus = btn.dataset.status;
            const newStatus = currentStatus === 'approved' ? 'pending' : 'approved'; // Simple toggle
            toggleLoader(true);
            const res = await DirectoryService.updateUserStatus(id, newStatus);
            toggleLoader(false);

            if (res.error) showToast("Erreur modification statut", "error");
            else {
                showToast(`Utilisateur ${newStatus === 'approved' ? 'validé' : 'désactivé'}`);
                // Update local data
                const u = users.find(x => x.id === id);
                if (u) u.status = newStatus;
                renderList();
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
                // Update local data
                const u = users.find(x => x.id === id);
                if (u) u.is_admin = newAdmin;
                renderList();
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
                // Remove from local array
                const idx = users.findIndex(x => x.id === id);
                if (idx > -1) users.splice(idx, 1);
                renderList();
            }
        }
    });
}
