import { DirectoryService } from './directory.service.js';
import { toggleLoader, showToast, escapeHtml, showConfirm } from '../../services/utils.js';
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
            // [FIX] Remplacement de currentUserId par le store
            const currentUser = store.state.user;
            const isMe = currentUser && u.id === currentUser.id;

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
        // Handle User Row Click (for details)
        const userRow = e.target.closest('.user-row');
        // Prevent click if clicking on a button inside row
        if (userRow && !e.target.closest('button')) {
            // Find user ID from a button inside the row (hacky but works with current DOM)
            // Better: add data-id to the row itself
            // Let's assume we can get ID from the delete/toggle buttons inside
            const btn = userRow.querySelector('button[data-id]');
            if (btn) viewUserDetails(btn.dataset.id);
            return;
        }

        const btn = e.target.closest('button');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'toggle-status') {
            const currentStatus = btn.dataset.status;
            const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
            toggleLoader(true);
            const res = await DirectoryService.updateUserStatus(id, newStatus);
            toggleLoader(false);

            if (res.error) showToast("Erreur modification statut", "error");
            else {
                showToast(`Utilisateur ${newStatus === 'approved' ? 'validé' : 'désactivé'}`);
                loadUsers();
            }
        }
        else if (action === 'toggle-admin') {
            const isAdmin = btn.dataset.isAdmin === 'true';
            const newAdmin = !isAdmin;
            const msg = `Confirmer ${newAdmin ? 'donner' : 'retirer'} les droits Admin ?`;

            showConfirm(msg, async () => {
                toggleLoader(true);
                const res = await DirectoryService.updateUserRole(id, newAdmin);
                toggleLoader(false);

                if (res.error) showToast("Erreur droits admin", "error");
                else {
                    showToast(`Droits mis à jour`);
                    loadUsers();
                }
            }, { type: 'danger' });
        }
        else if (action === 'delete') {
            showConfirm("Supprimer définitivement cet utilisateur ?", async () => {
                toggleLoader(true);
                const res = await DirectoryService.deleteUserProfile(id);
                toggleLoader(false);

                if (res.error) showToast("Erreur suppression", "error");
                else {
                    showToast("Utilisateur supprimé");
                    loadUsers();
                }
            }, { type: 'danger', confirmText: 'Supprimer' });
        }
    });

}

// ==========================================
// DETAILS MODAL & LOGIC
// ==========================================
async function viewUserDetails(uid) {
    if (!uid) return;
    toggleLoader(true);
    // Fetch full details if needed (using existing get single user would be better, but we can reuse the list data if we had it in state, else fetch)
    // For now we re-fetch to be safe and get fresh notes
    const { data: u, error } = await DirectoryService.getUserById(uid); // Need to ensure this exists in Service
    toggleLoader(false);

    if (error || !u) {
        showToast("Erreur chargement détails", "error");
        return;
    }

    const m = document.createElement('div');
    m.id = 'user-details-modal';
    m.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';

    m.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl animate-slide-up">
            <div class="bg-brand-600 p-8 text-center text-white relative">
                <button id="close-details-btn" class="absolute top-4 right-4 bg-white/20 p-2 rounded-full hover:bg-white/30 transition">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
                <div class="w-20 h-20 bg-white text-brand-600 rounded-full flex items-center justify-center text-3xl font-extrabold mx-auto mb-3 shadow-lg border-4 border-brand-400">
                    ${(u.first_name || '?')[0]}
                </div>
                <h2 class="text-xl font-bold">${u.first_name} ${u.last_name}</h2>
                <p class="opacity-80 text-xs font-medium">${u.email}</p>
            </div>

            <div class="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm space-y-2">
                    <div class="flex justify-between"><span class="text-slate-400">Téléphone</span> <span class="font-bold">${u.phone || '-'}</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Statut</span> <span class="font-bold ${u.status === 'approved' ? 'text-green-600' : 'text-orange-500'}">${u.status === 'approved' ? 'Actif' : 'En attente'}</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Total Heures</span> <span class="font-bold text-brand-600">${u.total_hours || 0}h</span></div>
                </div>

                <div class="bg-white border-2 border-slate-100 p-4 rounded-2xl">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="bg-slate-100 p-2 rounded-lg"><i data-lucide="briefcase" class="w-4 h-4 text-slate-600"></i></div>
                        <div>
                            <div class="font-bold text-sm text-slate-900">${u.role_title || 'Bénévole'}</div>
                            <div class="text-xs text-slate-500">Pôle ID: ${u.pole_id || 'Aucun'}</div>
                        </div>
                    </div>
                </div>

                <!-- Justificatif Viewer Button (Only if Pending) -->
                ${u.status === 'pending' ? `
                <button id="btn-view-proof" class="w-full py-3 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition flex items-center justify-center gap-2">
                    <i data-lucide="eye" class="w-4 h-4"></i> Voir Justificatif
                </button>` : ''}

                <div class="bg-yellow-50 p-4 rounded-2xl border border-yellow-200 relative">
                    <label class="text-[10px] font-bold text-yellow-700 uppercase mb-1 block flex items-center gap-1"><i data-lucide="sticky-note" class="w-3 h-3"></i> Note Interne</label>
                    <textarea id="admin-note-input" class="w-full bg-white p-3 rounded-xl text-sm outline-none border border-yellow-200 text-slate-700 placeholder-yellow-300/50" rows="3" placeholder="Note sur le bénévole...">${u.admin_note || ''}</textarea>
                    <button id="btn-save-note" class="mt-2 w-full py-2 bg-yellow-400 text-yellow-900 font-bold rounded-lg text-xs hover:bg-yellow-500 transition shadow-sm">Enregistrer la note</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(m);
    createIcons({ icons, root: m });

    m.querySelector('#close-details-btn').addEventListener('click', () => m.remove());

    const saveBtn = m.querySelector('#btn-save-note');
    if (saveBtn) saveBtn.addEventListener('click', async () => {
        const note = m.querySelector('#admin-note-input').value;
        toggleLoader(true);
        const res = await DirectoryService.updateAdminNote(uid, note);
        toggleLoader(false);
        if (res.error) showToast("Erreur sauvegarde note", "error");
        else showToast("Note enregistrée");
    });

    const proofBtn = m.querySelector('#btn-view-proof');
    if (proofBtn) proofBtn.addEventListener('click', () => openProof(uid));
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

        <div class="w-full h-full max-w-4xl max-h-[80vh] bg-white rounded-lg shadow-2xl overflow-hidden flex items-center justify-center relative">
            <object data="${url}" type="application/pdf" class="w-full h-full object-contain">
                <img src="${url}" class="w-full h-full object-contain bg-slate-800" alt="Justificatif">
            </object>
        </div>

        <div class="absolute bottom-8 flex gap-4 animate-slide-up">
            <button id="btn-doc-reject" class="px-6 py-3 bg-red-500 text-white font-bold rounded-full shadow-lg hover:bg-red-600 transition flex items-center gap-2 transform hover:scale-105">
                <i data-lucide="x-circle" class="w-5 h-5"></i> Refuser
            </button>
            <button id="btn-doc-accept" class="px-6 py-3 bg-green-500 text-white font-bold rounded-full shadow-lg hover:bg-green-600 transition flex items-center gap-2 transform hover:scale-105">
                <i data-lucide="check-circle-2" class="w-5 h-5"></i> Valider le dossier
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
                showToast("Dossier validé !");
                window.location.reload();
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
                showToast("Dossier refusé.");
                window.location.reload();
            }
        }, { type: 'danger', confirmText: 'Refuser' });
    });
}

export function cleanup() {
    // No specific cleanup needed
}

