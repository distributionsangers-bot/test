/**
 * ============================================
 * PARTICIPANTS VIEW (PREMIUM REDESIGN)
 * ============================================
 * Modale de gestion des participants à un créneau.
 * - Design Premium (Glassmorphism, Animations)
 * - Liste des inscrits avec Actions (Sélecteur, Check-in, Force Validation)
 * - Ajout Participant avec RECHERCHE INTELLIGENTE (comme le chat)
 * - Statistiques visuelles
 */

import { ParticipantsService } from './participants.service.js';
import { showToast, toggleLoader, showConfirm, escapeHtml, createAvatar, formatIdentity } from '../../services/utils.js'; // Ensure createAvatar exists or use inline
import { createIcons, icons } from 'lucide';
import { supabase } from '../../services/supabase.js';

let state = {
    shiftId: null,
    shiftTitle: '',
    currentTab: 'list', // 'list' | 'add'
    registrations: [],
    searchQuery: '',
    approvedUsers: [], // Cache for search
    searchResults: []
};

// =============================================================================
// 🚀 PUBLIC API
// =============================================================================

export async function openParticipantsModal(shiftId, title) {
    state.shiftId = shiftId;
    state.shiftTitle = title;
    state.currentTab = 'list';

    // Create Modal Container
    const modalId = 'participants-modal';
    document.getElementById(modalId)?.remove();

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in';

    document.body.appendChild(modal);

    // Initial Render (Loading)
    modal.innerHTML = renderModalStructure(true);
    createIcons({ icons, root: modal });

    // Fetch Data
    await loadRegistrations();

    // Render Content
    updateModalContent();
}

// =============================================================================
// 🎨 RENDERERS
// =============================================================================

function renderModalStructure(loading = false) {
    return `
        <div class="bg-white w-full max-w-2xl max-h-[85vh] md:max-h-[90vh] rounded-2xl md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-scale-in relative">
            <!-- Header (Premium Gradient) -->
            <div class="relative bg-gradient-to-r from-slate-900 to-slate-800 p-4 md:p-6 flex-shrink-0">
                <div class="absolute inset-0 bg-grid-white/5 bg-[length:20px_20px] pointer-events-none"></div>
                
                <div class="relative z-10 flex justify-between items-start gap-3">
                    <div class="min-w-0">
                        <h2 class="text-lg md:text-2xl font-black text-white tracking-tight leading-tight mb-1 truncate">
                            ${escapeHtml(state.shiftTitle)}
                        </h2>
                        <p class="text-slate-400 font-medium text-xs md:text-sm flex items-center gap-2">
                           Gestion des participants
                        </p>
                    </div>
                    <button id="btn-close-participants" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition backdrop-blur-md flex-shrink-0">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <!-- Tabs -->
                <div class="flex gap-2 md:gap-4 mt-4 md:mt-6 overflow-x-auto">
                    <button data-tab="list" class="tab-btn px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${state.currentTab === 'list' ? 'bg-white text-slate-900 shadow-lg' : 'bg-white/10 text-slate-300 hover:bg-white/20'}">
                        <i data-lucide="users" class="w-4 h-4"></i>
                        Inscrits <span id="badge-count" class="bg-slate-200 text-slate-800 text-[9px] px-1.5 py-0.5 rounded-md ml-1 font-extrabold hidden">0</span>
                    </button>
                    <button data-tab="add" class="tab-btn px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${state.currentTab === 'add' ? 'bg-white text-slate-900 shadow-lg' : 'bg-white/10 text-slate-300 hover:bg-white/20'}">
                        <i data-lucide="user-plus" class="w-4 h-4"></i>
                        <span class="hidden md:inline">Ajouter</span>
                        <span class="md:hidden">+</span>
                    </button>
                    <button id="btn-export-csv" class="ml-auto px-2 md:px-3 py-2 rounded-xl text-xs font-bold transition bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center gap-1 md:gap-2 border border-emerald-500/30 flex-shrink-0">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span class="hidden md:inline">Export CSV</span>
                    </button>
                </div>
            </div>

            <!-- Content Area -->
            <div id="modal-content" class="flex-1 overflow-y-auto bg-slate-50 relative">
                ${loading ? `
                    <div class="absolute inset-0 flex items-center justify-center">
                        <div class="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
                    </div>
                ` : ''}
            </div>
            
            <!-- Statistics Footer (Only for List Tab) -->
            <div id="modal-footer" class="p-3 md:p-4 bg-white border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-500 hidden flex-wrap gap-3">
                <!-- Dynamically filled -->
            </div>
        </div>
    `;
}

function renderListTab() {
    const regs = state.registrations;

    if (regs.length === 0) {
        return `
            <div class="flex flex-col items-center justify-center h-full text-center p-8">
                <div class="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-4 transform rotate-3">
                    <i data-lucide="users" class="w-10 h-10 text-slate-300"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-700">Aucun inscription</h3>
                <p class="text-slate-400 text-sm max-w-xs mx-auto mt-2">Ce créneau est vide pour le moment. Ajoutez des participants via l'onglet "Ajouter".</p>
            </div>
        `;
    }

    return `
        <div class="p-4 space-y-3">
            ${regs.map(reg => renderParticipantRow(reg)).join('')}
        </div>
    `;
}

function renderParticipantRow(r) {
    const profile = r.profiles;
    const isSchool = profile.mandatory_hours;
    const isPresent = r.attended;
    const isValidated = r.counts_for_hours;

    // Status Logic
    // School Volunteers: Check for 'Hors Quota' (Attended but Not Validated)
    const isQuotaOverflow = isSchool && isPresent && !isValidated;

    // Avatar
    const initial = (profile.first_name || '?')[0].toUpperCase();
    const bgColors = ['bg-red-100 text-red-600', 'bg-blue-100 text-blue-600', 'bg-emerald-100 text-emerald-600', 'bg-amber-100 text-amber-600', 'bg-purple-100 text-purple-600'];
    const colorClass = bgColors[(profile.id || 0).charCodeAt(0) % bgColors.length]; // Deterministic color

    const avatarHtml = `
        <div class="w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
            ${initial}
        </div>
    `;

    // Badges
    let badgeHtml = '';
    if (isSchool) badgeHtml += `<span class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100">🎓 École</span>`;

    // Warning
    let warningHtml = '';
    if (isQuotaOverflow) {
        warningHtml = `
            <div class="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 mt-1">
                <i data-lucide="alert-triangle" class="w-3 h-3"></i>
                Hors Quota (0h)
            </div>
        `;
    } else if (isPresent && isValidated && isSchool) {
        // Validated School (Present + Hours Count)
        warningHtml = `
            <div class="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 mt-1">
                <i data-lucide="check-circle-2" class="w-3 h-3"></i>
                Heures validées
            </div>
        `;
    }

    // Note Indicator - Make it more visible
    let noteHtml = '';
    if (r.note) {
        noteHtml = `
            <div class="mt-2 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                <div class="flex items-start gap-2">
                    <i data-lucide="message-square" class="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"></i>
                    <div class="flex-1 min-w-0">
                        <div class="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-0.5">Remarque</div>
                        <p class="text-xs text-blue-800 leading-relaxed">"${escapeHtml(r.note)}"</p>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div class="flex items-start gap-3">
                ${avatarHtml}
                
                <div class="flex-1 min-w-0 pt-0.5">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-bold text-slate-800 text-sm truncate">
                                ${escapeHtml(profile.first_name)} ${escapeHtml(profile.last_name)}
                            </h4>
                            <p class="text-xs text-slate-400 font-medium truncate">${escapeHtml(profile.phone || 'Pas de numéro')}</p>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-2 mt-1.5 items-center">
                        ${badgeHtml}
                        ${warningHtml}
                    </div>
                </div>

                <!-- Actions Column -->
                <div class="flex flex-col items-end gap-2">
                    <!-- Toggle Presence -->
                    <label class="cursor-pointer select-none">
                        <input type="checkbox" class="peer sr-only action-toggle-presence" data-reg-id="${r.id}" ${isPresent ? 'checked' : ''}>
                        <div class="
                            px-3 py-1.5 rounded-xl text-xs font-bold transition-all border
                            peer-checked:bg-emerald-500 peer-checked:text-white peer-checked:border-emerald-600 peer-checked:shadow-sm
                            bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100
                            flex items-center gap-1.5
                        ">
                            <i data-lucide="${isPresent ? 'check' : 'circle'}" class="w-3.5 h-3.5"></i>
                            <span>${isPresent ? 'Présent' : 'Absent'}</span>
                        </div>
                    </label>

                    <!-- More Actions Dropdown Trigger (simulated with hover group for simplicity or click) -->
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        ${isSchool ? `
                            <button class="action-force px-2 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold hover:bg-amber-100 border border-amber-200 transition" 
                                title="Forcer la validation des heures" data-reg-id="${r.id}" data-current-val="${isValidated}">
                                <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                            </button>
                        ` : ''}
                        <button class="action-delete px-2 py-1.5 bg-red-50 text-red-500 rounded-lg text-[10px] font-bold hover:bg-red-100 border border-red-200 transition" 
                            title="Désinscrire" data-reg-id="${r.id}">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Note Section - Full Width Below -->
            ${noteHtml}
        </div>
    `;
}

function renderAddTab() {
    return `
        <div class="flex flex-col h-full bg-slate-50">
            <!-- Search Header -->
            <div class="p-3 md:p-4 bg-white border-b border-slate-100 sticky top-0 z-10">
                <div class="relative">
                    <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                    <input id="user-search-input" type="text" placeholder="Rechercher par nom, email..." 
                        class="w-full pl-11 pr-4 py-2 md:py-3 bg-slate-50 border-none rounded-xl font-medium focus:ring-2 focus:ring-brand-500 transition placeholder:text-slate-400 text-sm md:text-base"
                        value="${escapeHtml(state.searchQuery)}">
                </div>
                <div class="mt-2 text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 flex justify-between">
                    <span>Résultats</span>
                    <span id="search-count" class="text-brand-600 hidden">0 trouvés</span>
                </div>
            </div>

            <!-- Results List -->
            <div id="search-results-list" class="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
                ${renderSearchResults()}
            </div>
        </div>
    `;
}


function renderSearchResults() {
    const list = state.searchResults;

    if (!state.searchQuery) {
        return `
            <div class="text-center py-10 opacity-50">
                <i data-lucide="search" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                <p class="text-xs md:text-sm font-semibold text-slate-400">Tapez un nom pour rechercher</p>
            </div>
        `;
    }

    if (list.length === 0) {
        return `
            <div class="text-center py-10">
                <p class="text-xs md:text-sm font-bold text-slate-400">Aucun bénévole trouvé</p>
            </div>
        `;
    }

    return list.map(u => {
        const initial = (u.first_name || '?')[0].toUpperCase();
        // Check if already registered
        const isRegistered = state.registrations.some(r => r.user_id === u.id);

        return `
            <div class="bg-white p-2 md:p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm hover:border-brand-200 transition-colors gap-3">
                <div class="flex items-center gap-2 md:gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 flex-shrink-0">
                        ${initial}
                    </div>
                    <div class="min-w-0">
                        <h4 class="font-bold text-slate-800 text-xs md:text-sm truncate">${escapeHtml(formatIdentity(u.first_name, u.last_name))}</h4>
                        <p class="text-xs text-slate-400 font-medium truncate">${escapeHtml(u.email)}</p>
                    </div>
                </div>
                
                ${isRegistered ? `
                    <span class="px-2 md:px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold whitespace-nowrap flex-shrink-0">Inscrit</span>
                ` : `
                    <button class="btn-add-user px-2 md:px-4 py-1 md:py-2 bg-brand-600 text-white rounded-lg text-xs font-bold shadow-md shadow-brand-500/20 hover:bg-brand-700 transition active:scale-95 whitespace-nowrap flex-shrink-0" data-user-id="${u.id}">
                        Ajouter
                    </button>
                `}
            </div>
        `;
    }).join('');
}


// =============================================================================
// 🧠 LOGIC & CONTROLLERS
// =============================================================================

async function loadRegistrations() {
    const { data } = await ParticipantsService.getShiftRegistrations(state.shiftId);
    state.registrations = data || [];
}

async function loadUsersForSearch() {
    // Cache load if empty
    if (state.approvedUsers.length === 0) {
        toggleLoader(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('status', 'approved')
            .order('last_name', { ascending: true })
            .limit(500); // Limit for performance, search API better for large sets
        toggleLoader(false);

        if (data) state.approvedUsers = data;
    }
}

function filterUsers(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    return state.approvedUsers.filter(u =>
        (u.first_name || '').toLowerCase().includes(q) ||
        (u.last_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
}

function updateModalContent() {
    const container = document.getElementById('modal-content');
    const footer = document.getElementById('modal-footer');
    const badge = document.getElementById('badge-count');
    const btnList = document.querySelector('[data-tab="list"]');
    const btnAdd = document.querySelector('[data-tab="add"]');

    // Update Tab Styles
    if (state.currentTab === 'list') {
        btnList.className = 'tab-btn px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 bg-white text-slate-900 shadow-lg';
        btnAdd.className = 'tab-btn px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 bg-white/10 text-slate-300 hover:bg-white/20';
        container.innerHTML = renderListTab();
        footer.classList.remove('hidden');
    } else {
        btnList.className = 'tab-btn px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 bg-white/10 text-slate-300 hover:bg-white/20';
        btnAdd.className = 'tab-btn px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 bg-white text-slate-900 shadow-lg';
        container.innerHTML = renderAddTab();
        footer.classList.add('hidden');

        // Setup Search Listener
        const searchInput = document.getElementById('user-search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.addEventListener('input', (e) => {
                state.searchQuery = e.target.value;
                state.searchResults = filterUsers(state.searchQuery);
                document.getElementById('search-results-list').innerHTML = renderSearchResults();
                createIcons({ icons, root: document.getElementById('search-results-list') });

                // Update count
                const countEl = document.getElementById('search-count');
                if (countEl && state.searchQuery) {
                    countEl.textContent = `${state.searchResults.length} trouvés`;
                    countEl.classList.remove('hidden');
                } else if (countEl) {
                    countEl.classList.add('hidden');
                }
            });
        }
    }

    // Update Badge
    if (badge) {
        badge.textContent = state.registrations.length;
        badge.classList.remove('hidden');
    }

    // Update Footer Stats
    if (state.currentTab === 'list') {
        const total = state.registrations.length;
        const attended = state.registrations.filter(r => r.attended).length;
        footer.innerHTML = `
            <div class="flex gap-4">
                <span>Total: <span class="text-slate-800">${total}</span></span>
                <span>Présents: <span class="text-emerald-600">${attended}</span></span>
            </div>
        `;
    }

    createIcons({ icons, root: container });
    bindListEvents();
    if (state.currentTab === 'add') bindAddButtons();
}

function bindListEvents() {
    const list = document.getElementById('modal-content');
    if (!list) return;

    // Toggle Presence
    list.querySelectorAll('.action-toggle-presence').forEach(cb => {
        cb.addEventListener('change', async (e) => {
            const regId = e.target.dataset.regId;
            const newVal = e.target.checked;

            toggleLoader(true);
            await ParticipantsService.updateAttendance(regId, newVal);
            await loadRegistrations(); // Refresh full data to catch side effects
            toggleLoader(false);
            updateModalContent();
        });
    });

    // Delete
    list.querySelectorAll('.action-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const regId = btn.dataset.regId;
            showConfirm("Désinscrire ce bénévole ?", async () => {
                toggleLoader(true);
                await ParticipantsService.deleteRegistration(regId);
                await loadRegistrations();
                toggleLoader(false);
                updateModalContent();
                showToast("Bénévole désinscrit");
            }, { type: 'danger' });
        });
    });

    // Force Validation
    list.querySelectorAll('.action-force').forEach(btn => {
        btn.addEventListener('click', async () => {
            const regId = btn.dataset.regId;
            const currentVal = btn.dataset.currentVal === 'true';
            const newVal = !currentVal;

            let msg = newVal
                ? "Forcer la validation des heures (comptera dans le total même si hors quota) ?"
                : "Retirer la validation des heures ?";

            showConfirm(msg, async () => {
                toggleLoader(true);
                const { success } = await ParticipantsService.forceHoursValidation(regId, newVal);
                if (success) {
                    await loadRegistrations();
                    updateModalContent();
                    showToast("Validation mise à jour");
                } else {
                    showToast("Erreur lors de la mise à jour", "error");
                }
                toggleLoader(false);
            }, { type: 'warning', confirmText: 'Valider' });
        });
    });
}

function bindAddButtons() {
    const modal = document.getElementById('modal-content');
    if (!modal) return;

    modal.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-add-user');
        if (!btn) return;

        const userId = btn.dataset.userId;

        // First attempt (no force)
        toggleLoader(true);
        const res = await ParticipantsService.addParticipant(state.shiftId, userId, false);
        toggleLoader(false);

        if (res.needsConfirmation) {
            showConfirm("Le créneau est complet. Voulez-vous augmenter la capacité et ajouter ce bénévole quand même ?", async () => {
                toggleLoader(true);
                const forceRes = await ParticipantsService.addParticipant(state.shiftId, userId, true);
                toggleLoader(false);

                if (forceRes.error) {
                    showToast(forceRes.error.message || "Erreur ajout forcé", "error");
                } else {
                    showToast("Participant ajouté (capacité augmentée)");
                    handleSuccessAdd();
                }
            }, { type: 'warning', confirmText: 'Forcer l\'ajout' });
            return;
        }

        if (res.error) {
            showToast(res.error.message || "Erreur ajout", "error");
        } else {
            showToast("Participant ajouté");
            handleSuccessAdd();
        }
    });
}

async function handleSuccessAdd() {
    // Refresh registrations to update the "already registered" state
    await loadRegistrations();
    // Stay on the same tab and just refresh the search results
    const searchResultsList = document.getElementById('search-results-list');
    if (searchResultsList) {
        searchResultsList.innerHTML = renderSearchResults();
        createIcons({ icons, root: searchResultsList });
    }
    // Update the badge count
    const badge = document.getElementById('badge-count');
    if (badge) {
        badge.textContent = state.registrations.length;
    }
}

// =============================================================================
// ⚡ EVENT LISTENERS
// =============================================================================

document.addEventListener('click', (e) => {
    // Close Modal
    if (e.target.closest('#btn-close-participants')) {
        document.getElementById('participants-modal')?.remove();
        // Dispatch custom event to notify planning view to refresh
        window.dispatchEvent(new CustomEvent('participants-updated'));
    }

    // Tab Switching
    const tabBtn = e.target.closest('.tab-btn');
    if (tabBtn && document.getElementById('participants-modal')) {
        const tab = tabBtn.dataset.tab;
        if (tab !== state.currentTab) {
            state.currentTab = tab;
            if (tab === 'add') {
                loadUsersForSearch().then(() => {
                    updateModalContent();
                });
            } else {
                updateModalContent();
            }
        }
    }

    // Export CSV
    if (e.target.closest('#btn-export-csv')) {
        ParticipantsService.exportParticipantsCSV(state.shiftId).then(({ data }) => {
            if (data) {
                const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `participants_export.csv`;
                a.click();
                showToast("Export téléchargé");
            }
        });
    }
});
