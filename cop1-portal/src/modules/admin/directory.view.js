import { DirectoryService } from './directory.service.js';
import { toggleLoader, showToast, escapeHtml, showConfirm } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { store } from '../../core/store.js';

// State
let state = {
    page: 1,
    limit: 15,
    search: '',
    filter: 'all',
    sort: 'created_at',
    sortDir: 'desc',
    total: 0,
    stats: null
};

export async function renderDirectory(container) {
    if (!container) return;

    // Skeleton
    container.innerHTML = `
        <div class="space-y-6 animate-pulse">
            <div class="h-32 bg-gradient-to-r from-slate-200 to-slate-300 rounded-3xl"></div>
            <div class="h-12 bg-slate-100 rounded-2xl"></div>
            <div class="space-y-3">
                <div class="h-20 bg-slate-50 rounded-2xl"></div>
                <div class="h-20 bg-slate-50 rounded-2xl"></div>
                <div class="h-20 bg-slate-50 rounded-2xl"></div>
            </div>
        </div>
    `;

    // Load stats first
    const statsRes = await DirectoryService.getDirectoryStats();
    state.stats = statsRes.data || { total: 0, pending: 0, admins: 0, withPermit: 0 };

    // Main Layout
    container.innerHTML = `
        <div class="pb-24 max-w-5xl mx-auto space-y-6">
            
            <!-- HEADER PREMIUM -->
            <div class="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 shadow-2xl shadow-purple-500/20 p-8">
                <div class="absolute inset-0 opacity-10" style="background-image: url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
                
                <div class="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div class="text-white">
                        <h1 class="text-3xl font-black tracking-tight mb-2">Annuaire</h1>
                        <p class="text-white/70 font-medium">Gérez votre équipe de bénévoles</p>
                    </div>
                    
                    <!-- Stats Cards -->
                    <div class="flex gap-3">
                        <div class="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 text-center border border-white/20">
                            <div class="text-2xl font-black text-white">${state.stats.total}</div>
                            <div class="text-[10px] font-bold text-white/60 uppercase">Total</div>
                        </div>
                        <div class="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 text-center border border-white/20">
                            <div class="text-2xl font-black text-amber-300">${state.stats.pending}</div>
                            <div class="text-[10px] font-bold text-white/60 uppercase">En attente</div>
                        </div>
                        <div class="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 text-center border border-white/20">
                            <div class="text-2xl font-black text-rose-300">${state.stats.admins}</div>
                            <div class="text-[10px] font-bold text-white/60 uppercase">Admins</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SEARCH & FILTERS -->
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div class="flex flex-col md:flex-row gap-4">
                    <!-- Search -->
                    <div class="relative flex-1">
                        <i data-lucide="search" class="absolute left-4 top-3.5 w-5 h-5 text-slate-400"></i>
                        <input type="text" id="directory-search" placeholder="Rechercher par nom, email, téléphone..." 
                            class="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl outline-none font-semibold text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition border border-slate-100">
                    </div>
                    
                    <!-- Export Button -->
                    <button id="btn-export-csv" class="px-5 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition flex items-center gap-2 text-sm">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        Exporter
                    </button>
                </div>

                <!-- Filter Pills -->
                <div class="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
                    <button data-filter="all" class="filter-btn active px-4 py-2 rounded-xl text-xs font-bold transition bg-slate-900 text-white shadow-md whitespace-nowrap">
                        Tous <span class="opacity-60">(${state.stats.total})</span>
                    </button>
                    <button data-filter="pending" class="filter-btn px-4 py-2 rounded-xl text-xs font-bold transition bg-white text-slate-500 border border-slate-100 hover:bg-slate-50 whitespace-nowrap">
                        ⏳ En attente <span class="opacity-60">(${state.stats.pending})</span>
                    </button>
                    <button data-filter="admin" class="filter-btn px-4 py-2 rounded-xl text-xs font-bold transition bg-white text-slate-500 border border-slate-100 hover:bg-slate-50 whitespace-nowrap">
                        🛡️ Admins <span class="opacity-60">(${state.stats.admins})</span>
                    </button>
                    <button data-filter="permit" class="filter-btn px-4 py-2 rounded-xl text-xs font-bold transition bg-white text-slate-500 border border-slate-100 hover:bg-slate-50 whitespace-nowrap">
                        🚗 Conducteurs <span class="opacity-60">(${state.stats.withPermit})</span>
                    </button>
                    <button data-filter="mandatory" class="filter-btn px-4 py-2 rounded-xl text-xs font-bold transition bg-white text-slate-500 border border-slate-100 hover:bg-slate-50 whitespace-nowrap">
                        🎓 Scolaire
                    </button>
                </div>
            </div>

            <!-- USER LIST -->
            <div id="directory-list" class="space-y-3">
                <!-- Users injected here -->
            </div>
            
            <!-- PAGINATION -->
            <div id="directory-pagination"></div>
        </div>
    `;

    createIcons({ icons, root: container });
    setupEventListeners(container);
    await loadUsers();
}

async function loadUsers() {
    const listContainer = document.getElementById('directory-list');
    const paginationContainer = document.getElementById('directory-pagination');
    if (!listContainer) return;

    listContainer.innerHTML = `
        <div class="space-y-3">
            ${Array(5).fill(0).map(() => `
                <div class="bg-white p-5 rounded-2xl border border-slate-100 animate-pulse">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 rounded-2xl bg-slate-100"></div>
                        <div class="flex-1 space-y-2">
                            <div class="h-4 bg-slate-100 rounded w-1/3"></div>
                            <div class="h-3 bg-slate-50 rounded w-1/2"></div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    const { data, count, error } = await DirectoryService.getUsers(state.page, state.limit, state.search, state.filter);

    if (error) {
        listContainer.innerHTML = `
            <div class="text-center py-16 bg-white rounded-2xl border border-slate-100">
                <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="alert-circle" class="w-8 h-8 text-red-400"></i>
                </div>
                <p class="text-red-500 font-bold">Erreur de chargement</p>
            </div>
        `;
        createIcons({ icons, root: listContainer });
        return;
    }

    state.total = count || 0;
    const totalPages = Math.ceil(state.total / state.limit);

    if (!data || data.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-16 bg-white rounded-2xl border border-slate-100">
                <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="users" class="w-8 h-8 text-slate-300"></i>
                </div>
                <p class="text-slate-400 font-semibold">Aucun bénévole trouvé</p>
                <p class="text-xs text-slate-300 mt-1">Modifiez vos filtres de recherche</p>
            </div>
        `;
        createIcons({ icons, root: listContainer });
        renderPagination(paginationContainer, totalPages);
        return;
    }

    listContainer.innerHTML = data.map(u => renderUserCard(u)).join('');
    createIcons({ icons, root: listContainer });
    renderPagination(paginationContainer, totalPages);
}

function renderUserCard(u) {
    const currentUser = store.state.user;
    const isMe = currentUser && u.id === currentUser.id;
    const fullName = escapeHtml(`${u.first_name || ''} ${u.last_name || ''}`);
    const initial = (u.first_name || '?')[0].toUpperCase();
    const isAdmin = u.is_admin;
    const isApproved = u.status === 'approved';
    const isPending = u.status === 'pending';
    const hours = u.total_hours || 0;
    const hasPermit = u.has_permit;
    const isMandatory = u.mandatory_hours;

    // Check if new (< 7 days)
    const isNew = (new Date() - new Date(u.created_at)) < 7 * 24 * 60 * 60 * 1000;

    // Avatar gradient based on role
    const avatarBg = isAdmin
        ? 'from-rose-500 to-orange-500'
        : isPending
            ? 'from-amber-400 to-yellow-500'
            : 'from-brand-500 to-indigo-600';

    // Status config
    let statusBadge = '';
    if (isPending) {
        statusBadge = `<span class="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">⏳ En attente</span>`;
    } else if (isApproved) {
        statusBadge = `<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">✓ Validé</span>`;
    } else {
        statusBadge = `<span class="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-200">✗ Refusé</span>`;
    }

    const roleBadge = isAdmin
        ? `<span class="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">🛡️ Admin</span>`
        : '';

    const badges = [];
    if (hasPermit) badges.push(`<span class="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">🚗</span>`);
    if (isMandatory) badges.push(`<span class="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">🎓</span>`);
    if (isNew) badges.push(`<span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">✨ Nouveau</span>`);

    return `
        <div class="user-row bg-white p-5 rounded-2xl border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all cursor-pointer group" data-user-id="${u.id}">
            <div class="flex items-center gap-4">
                <!-- Avatar -->
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarBg} flex items-center justify-center text-white text-xl font-black shadow-lg flex-shrink-0">
                    ${initial}
                </div>
                
                <!-- Info -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap mb-1">
                        <span class="font-bold text-slate-900">${fullName}</span>
                        ${roleBadge}
                        ${statusBadge}
                    </div>
                    <div class="text-xs text-slate-400 font-medium truncate">${escapeHtml(u.email)}</div>
                    <div class="flex items-center gap-3 mt-2">
                        <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">${hours}h</span>
                        ${badges.join('')}
                        <span class="text-[10px] text-slate-300">Inscrit ${new Date(u.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${!isMe ? `
                        <button data-action="toggle-status" data-id="${u.id}" data-status="${u.status}" 
                            class="p-2.5 rounded-xl transition ${isApproved ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-400 bg-slate-50 hover:bg-slate-100'}" 
                            title="${isApproved ? 'Désactiver' : 'Valider'}">
                            <i data-lucide="${isApproved ? 'check-circle' : 'circle'}" class="w-5 h-5 pointer-events-none"></i>
                        </button>
                        <button data-action="toggle-role" data-id="${u.id}" data-is-admin="${isAdmin}" 
                            class="p-2.5 rounded-xl transition ${isAdmin ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' : 'text-slate-400 bg-slate-50 hover:bg-slate-100'}" 
                            title="${isAdmin ? 'Retirer Admin' : 'Passer Admin'}">
                            <i data-lucide="shield" class="w-5 h-5 pointer-events-none"></i>
                        </button>
                        <button data-action="delete" data-id="${u.id}" 
                            class="p-2.5 rounded-xl text-slate-400 bg-slate-50 hover:text-red-500 hover:bg-red-50 transition" 
                            title="Supprimer">
                            <i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i>
                        </button>
                    ` : `<span class="text-xs text-slate-300 font-medium italic px-3">Vous</span>`}
                </div>
            </div>
        </div>
    `;
}

function renderPagination(container, totalPages) {
    if (!container) return;
    if (state.total === 0) {
        container.innerHTML = '';
        return;
    }

    const start = (state.page - 1) * state.limit + 1;
    const end = Math.min(state.page * state.limit, state.total);

    container.innerHTML = `
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl border border-slate-100 p-4">
            <div class="text-xs font-semibold text-slate-400">
                Affichage <span class="text-slate-700">${start}-${end}</span> sur <span class="text-slate-700">${state.total}</span> bénévoles
            </div>
            <div class="flex items-center gap-2">
                <button id="btn-prev" ${state.page === 1 ? 'disabled' : ''} class="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition">
                    <i data-lucide="chevron-left" class="w-5 h-5"></i>
                </button>
                <span class="text-sm font-bold text-slate-700 min-w-[4rem] text-center">${state.page} / ${totalPages || 1}</span>
                <button id="btn-next" ${state.page >= totalPages ? 'disabled' : ''} class="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition">
                    <i data-lucide="chevron-right" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
    `;
    createIcons({ icons, root: container });

    container.querySelector('#btn-prev')?.addEventListener('click', () => {
        if (state.page > 1) { state.page--; loadUsers(); }
    });
    container.querySelector('#btn-next')?.addEventListener('click', () => {
        if (state.page < totalPages) { state.page++; loadUsers(); }
    });
}

function setupEventListeners(container) {
    // Search
    const searchInput = container.querySelector('#directory-search');
    let timeoutId;
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            state.search = e.target.value.trim();
            state.page = 1;
            loadUsers();
        }, 400);
    });

    // Filters
    const filterBtns = container.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.className = 'filter-btn px-4 py-2 rounded-xl text-xs font-bold transition bg-white text-slate-500 border border-slate-100 hover:bg-slate-50 whitespace-nowrap';
            });
            btn.className = 'filter-btn active px-4 py-2 rounded-xl text-xs font-bold transition bg-slate-900 text-white shadow-md whitespace-nowrap';
            state.filter = btn.dataset.filter;
            state.page = 1;
            loadUsers();
        });
    });

    // Export CSV
    container.querySelector('#btn-export-csv')?.addEventListener('click', async () => {
        toggleLoader(true);
        const { csv, error } = await DirectoryService.exportUsersCSV(state.filter);
        toggleLoader(false);

        if (error || !csv) {
            showToast("Erreur lors de l'export", "error");
            return;
        }

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `benevoles_${state.filter}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Export téléchargé ✓");
    });

    // User List Actions (delegation)
    const listContainer = container.querySelector('#directory-list');
    listContainer?.addEventListener('click', async (e) => {
        const userRow = e.target.closest('.user-row');
        const btn = e.target.closest('button');

        // Row click (but not button) -> open details
        if (userRow && !btn) {
            const userId = userRow.dataset.userId;
            if (userId) viewUserDetails(userId);
            return;
        }

        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (!action || !id) return;

        if (action === 'toggle-status') {
            const currentStatus = btn.dataset.status;
            const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
            toggleLoader(true);
            const res = await DirectoryService.updateUserStatus(id, newStatus);
            toggleLoader(false);

            if (res.error) showToast("Erreur modification statut", "error");
            else {
                showToast(newStatus === 'approved' ? "Compte validé ✓" : "Compte désactivé");
                loadUsers();
            }
        } else if (action === 'toggle-role') {
            const isAdmin = btn.dataset.isAdmin === 'true';
            const newAdmin = !isAdmin;

            showConfirm(`${newAdmin ? 'Donner' : 'Retirer'} les droits administrateur ?`, async () => {
                toggleLoader(true);
                const res = await DirectoryService.updateUserRole(id, newAdmin);
                toggleLoader(false);

                if (res.error) showToast("Erreur droits admin", "error");
                else {
                    showToast(newAdmin ? "Admin ajouté ✓" : "Admin retiré");
                    loadUsers();
                }
            }, { type: 'danger' });
        } else if (action === 'delete') {
            showConfirm("⚠️ Supprimer définitivement ce bénévole ?\n\nCette action supprimera :\n• Son profil\n• Ses inscriptions\n• Ses justificatifs", async () => {
                toggleLoader(true);
                const res = await DirectoryService.deleteUserProfile(id);
                toggleLoader(false);

                if (res.error) {
                    console.error("Delete error:", res.error);
                    showToast("Erreur suppression: " + (res.error.message || 'Erreur'), "error");
                } else {
                    showToast("Bénévole supprimé");
                    loadUsers();
                    // Refresh stats
                    const statsRes = await DirectoryService.getDirectoryStats();
                    state.stats = statsRes.data;
                }
            }, { type: 'danger', confirmText: 'Supprimer définitivement' });
        }
    });
}

// ==========================================
// DETAILS MODAL
// ==========================================
async function viewUserDetails(uid) {
    if (!uid) return;
    toggleLoader(true);
    const { data: u, error } = await DirectoryService.getUserById(uid);
    toggleLoader(false);

    if (error || !u) {
        showToast("Erreur chargement détails", "error");
        return;
    }

    const fullName = escapeHtml(`${u.first_name || ''} ${u.last_name || ''}`);
    const initial = (u.first_name || '?')[0].toUpperCase();
    const isAdmin = u.is_admin;
    const hasPermit = u.has_permit;
    const isMandatory = u.mandatory_hours;
    const hours = u.total_hours || 0;

    const avatarBg = isAdmin ? 'from-rose-500 to-orange-500' : 'from-brand-500 to-indigo-600';

    const modal = document.createElement('div');
    modal.id = 'user-details-modal';
    modal.className = 'fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in';

    modal.innerHTML = `
        <div class="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
            <!-- Header -->
            <div class="bg-gradient-to-br ${avatarBg} p-8 text-center text-white relative">
                <button id="close-details-btn" class="absolute top-4 right-4 bg-white/20 p-2 rounded-full hover:bg-white/30 transition">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
                <div class="w-20 h-20 bg-white text-indigo-600 rounded-3xl flex items-center justify-center text-3xl font-black mx-auto mb-4 shadow-xl">
                    ${initial}
                </div>
                <h2 class="text-2xl font-black">${fullName}</h2>
                <p class="text-white/70 text-sm font-medium">${escapeHtml(u.email)}</p>
                ${isAdmin ? `<span class="inline-block mt-3 px-3 py-1 bg-white/20 rounded-full text-xs font-bold">🛡️ Administrateur</span>` : ''}
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-3 gap-3 p-6 bg-slate-50 border-b border-slate-100">
                <div class="text-center">
                    <div class="text-2xl font-black text-emerald-600">${hours}h</div>
                    <div class="text-[10px] font-bold text-slate-400 uppercase">Heures</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-black text-slate-700">${hasPermit ? '✓' : '—'}</div>
                    <div class="text-[10px] font-bold text-slate-400 uppercase">Permis</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-black text-slate-700">${isMandatory ? '🎓' : '💚'}</div>
                    <div class="text-[10px] font-bold text-slate-400 uppercase">Type</div>
                </div>
            </div>

            <!-- Details -->
            <div class="p-6 space-y-4 max-h-[40vh] overflow-y-auto">
                <div class="flex justify-between items-center py-2 border-b border-slate-100">
                    <span class="text-sm text-slate-400">Téléphone</span>
                    <span class="font-bold text-slate-700">${u.phone || 'Non renseigné'}</span>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-slate-100">
                    <span class="text-sm text-slate-400">Statut</span>
                    <span class="font-bold ${u.status === 'approved' ? 'text-emerald-600' : u.status === 'pending' ? 'text-amber-600' : 'text-red-500'}">${u.status === 'approved' ? 'Validé' : u.status === 'pending' ? 'En attente' : 'Refusé'}</span>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-slate-100">
                    <span class="text-sm text-slate-400">Inscription</span>
                    <span class="font-bold text-slate-700">${new Date(u.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-slate-100">
                    <span class="text-sm text-slate-400">Type de profil</span>
                    <button id="btn-toggle-type" class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${isMandatory ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'}" title="Cliquez pour changer">
                        ${isMandatory ? '🎓 Scolaire (Heures obligatoires)' : '💚 Bénévole Simple'}
                        <i data-lucide="refresh-cw" class="w-3 h-3"></i>
                    </button>
                </div>

                ${u.status === 'pending' ? `
                <button id="btn-view-proof" class="w-full py-3 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition flex items-center justify-center gap-2">
                    <i data-lucide="file-text" class="w-5 h-5"></i>
                    Voir le justificatif
                </button>
                ` : ''}

                <!-- Admin Note -->
                <div class="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                    <label class="text-[10px] font-bold text-amber-700 uppercase mb-2 block flex items-center gap-1">
                        <i data-lucide="sticky-note" class="w-3 h-3"></i> Note interne
                    </label>
                    <textarea id="admin-note-input" class="w-full bg-white p-3 rounded-xl text-sm outline-none border border-amber-200 text-slate-700 resize-none" rows="3" placeholder="Note sur ce bénévole...">${u.admin_note || ''}</textarea>
                    <button id="btn-save-note" class="mt-2 w-full py-2.5 bg-amber-400 text-amber-900 font-bold rounded-xl text-sm hover:bg-amber-500 transition">
                        Enregistrer la note
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    createIcons({ icons, root: modal });

    // Events
    modal.querySelector('#close-details-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    modal.querySelector('#btn-save-note')?.addEventListener('click', async () => {
        const note = modal.querySelector('#admin-note-input').value;
        toggleLoader(true);
        const res = await DirectoryService.updateAdminNote(uid, note);
        toggleLoader(false);
        if (res.error) showToast("Erreur sauvegarde note", "error");
        else showToast("Note enregistrée ✓");
    });

    modal.querySelector('#btn-view-proof')?.addEventListener('click', () => openProof(uid));

    modal.querySelector('#btn-toggle-type')?.addEventListener('click', () => {
        const newStatus = !isMandatory;
        showConfirm(`Passer ce bénévole en ${newStatus ? 'Scolaire (heures obligatoires)' : 'Bénévole Simple'} ?`, async () => {
            toggleLoader(true);
            const res = await DirectoryService.updateUserProfile(uid, { mandatory_hours: newStatus });
            toggleLoader(false);
            if (res.error) showToast("Erreur modification", "error");
            else {
                showToast("Type de profil mis à jour ✓");
                // Refresh modal
                modal.remove();
                viewUserDetails(uid); // Re-open with new data
                loadUsers(); // Refresh background list
            }
        });
    });
}

// ==========================================
// DOCUMENT VIEWER
// ==========================================
async function openProof(userId) {
    if (!userId) return;
    toggleLoader(true);
    const { signedUrl, error } = await DirectoryService.getProofUrl(userId);
    toggleLoader(false);

    if (error || !signedUrl) {
        showToast("Document introuvable", "error");
        return;
    }

    openDocumentViewer(signedUrl, userId);
}

function openDocumentViewer(url, userId) {
    const m = document.createElement('div');
    m.id = 'doc-viewer-modal';
    m.className = 'fixed inset-0 bg-slate-900/95 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in';

    m.innerHTML = `
        <div class="absolute top-4 right-4 flex gap-3 z-50">
            <a href="${url}" download="justificatif_${userId}" class="bg-white/10 text-white p-3 rounded-full hover:bg-white/20 transition backdrop-blur-md" title="Télécharger">
                <i data-lucide="download" class="w-5 h-5"></i>
            </a>
            <button id="close-doc-btn" class="bg-white/10 text-white p-3 rounded-full hover:bg-red-500/80 transition backdrop-blur-md">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>

        <div class="w-full h-full max-w-4xl max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex items-center justify-center relative">
            <object data="${url}" type="application/pdf" class="w-full h-full">
                <img src="${url}" class="w-full h-full object-contain bg-slate-100" alt="Justificatif">
            </object>
        </div>

        <div class="absolute bottom-8 flex gap-4 animate-slide-up">
            <button id="btn-doc-reject" class="px-6 py-3 bg-red-500 text-white font-bold rounded-full shadow-lg hover:bg-red-600 transition flex items-center gap-2">
                <i data-lucide="x-circle" class="w-5 h-5"></i> Refuser
            </button>
            <button id="btn-doc-accept" class="px-6 py-3 bg-emerald-500 text-white font-bold rounded-full shadow-lg hover:bg-emerald-600 transition flex items-center gap-2">
                <i data-lucide="check-circle" class="w-5 h-5"></i> Valider le dossier
            </button>
        </div>
    `;

    document.body.appendChild(m);
    createIcons({ icons, root: m });

    m.querySelector('#close-doc-btn').addEventListener('click', () => m.remove());

    m.querySelector('#btn-doc-accept').addEventListener('click', async () => {
        showConfirm("Valider ce dossier ?", async () => {
            m.remove();
            toggleLoader(true);
            await DirectoryService.deleteProofFile(userId);
            const res = await DirectoryService.updateUserStatus(userId, 'approved');
            toggleLoader(false);
            if (res.error) showToast("Erreur validation", "error");
            else {
                showToast("Dossier validé ! ✓");
                document.getElementById('user-details-modal')?.remove();
                loadUsers();
            }
        });
    });

    m.querySelector('#btn-doc-reject').addEventListener('click', async () => {
        showConfirm("Refuser ce dossier ?", async () => {
            m.remove();
            toggleLoader(true);
            await DirectoryService.deleteProofFile(userId);
            const res = await DirectoryService.updateUserStatus(userId, 'rejected');
            toggleLoader(false);
            if (res.error) showToast("Erreur refus", "error");
            else {
                showToast("Dossier refusé");
                document.getElementById('user-details-modal')?.remove();
                loadUsers();
            }
        }, { type: 'danger', confirmText: 'Refuser' });
    });
}

export function cleanup() {
    // Cleanup if needed
}
