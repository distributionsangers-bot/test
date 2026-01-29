import { PolesService } from './poles.service.js';
import { store } from '../../core/store.js';
import { toggleLoader, showToast, escapeHtml, showConfirm } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { ChatService } from '../chat/chat.service.js';

export async function renderPoles(container) {
    if (!container) return;

    // 1. Fetch Data with hierarchy
    const [hierarchy, allTeams, leaders, myInterests] = await Promise.all([
        PolesService.getTeamsHierarchy(),
        PolesService.getAllTeams(),
        PolesService.getLeaders(),
        store.state.user ? PolesService.getMyInterests(store.state.user.id) : []
    ]);

    const { antenne, directions, poles } = hierarchy;
    const isViewAdmin = store.state.adminMode && store.state.profile?.is_admin;

    // Helper: Render a single pole card
    const renderPoleCard = (t) => {
        const intr = myInterests.includes(t.id);
        const teamLeaders = leaders ? leaders.filter(l => l.pole_id === t.id) : [];

        const adminActions = isViewAdmin ? `
            <div class="absolute top-3 right-3 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button data-action="view-candidates" data-id="${t.id}" data-name="${escapeHtml(t.name)}" class="p-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-100 transition shadow-sm" title="Voir les intéressés">
                    <i data-lucide="users" class="w-3.5 h-3.5 pointer-events-none"></i>
                </button>
                <button data-action="edit-pole" data-id="${t.id}" class="p-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-slate-100 transition shadow-sm" title="Modifier">
                    <i data-lucide="pencil" class="w-3.5 h-3.5 pointer-events-none"></i>
                </button>
                <button data-action="delete-pole" data-id="${t.id}" class="p-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-100 transition shadow-sm" title="Supprimer">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5 pointer-events-none"></i>
                </button>
            </div>
        ` : '';

        // Leaders HTML (all leaders with responsive layout)
        const leadersHtml = teamLeaders.length > 0 ? `
            <div class="mt-auto pt-3 border-t border-slate-100">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">👥 Responsables</p>
                <div class="flex flex-wrap gap-2">
                    ${teamLeaders.map(l => `
                        <div class="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1.5 min-w-0">
                            <div class="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 border border-white shadow-sm overflow-hidden flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold">
                                ${l.photo_url
                ? `<img src="${l.photo_url}" class="w-full h-full object-cover" alt="${l.first_name}">`
                : l.first_name[0].toUpperCase()
            }
                            </div>
                            <div class="min-w-0 flex-1">
                                <span class="text-xs font-medium text-slate-700 truncate block">${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)}</span>
                                ${l.role_title ? `<span class="text-[10px] text-slate-400 truncate block">${escapeHtml(l.role_title)}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        return `
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full group relative" data-pole-id="${t.id}">
                ${adminActions}
                
                <!-- Header -->
                <div class="p-4 bg-gradient-to-br from-brand-50/50 to-indigo-50/30 border-b border-slate-100">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-white/80 border border-white/50 flex items-center justify-center text-brand-600 shadow-sm">
                            <i data-lucide="${t.icon || 'users'}" class="w-5 h-5"></i>
                        </div>
                        <h4 class="font-bold text-sm text-slate-900 line-clamp-2">${escapeHtml(t.name)}</h4>
                    </div>
                </div>

                <!-- Content -->
                <div class="p-4 flex flex-col flex-1">
                    <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                        ${escapeHtml(t.description || 'Découvrez cette équipe et ses missions.')}
                    </p>

                    <!-- Contact Link -->
                    ${t.email ? `
                        <div class="mb-3">
                            <a href="mailto:${t.email}" class="inline-flex items-start gap-1.5 text-[11px] font-semibold text-brand-600 hover:text-brand-700 bg-brand-50/50 hover:bg-brand-50 px-2 py-1 rounded-md transition">
                                <i data-lucide="mail" class="w-3 h-3 flex-shrink-0 mt-0.5"></i>
                                <span class="break-all">${t.email}</span>
                            </a>
                        </div>
                    ` : ''}

                    ${leadersHtml}
                </div>

                <!-- Footer Button (Only for non-admin) -->
                ${!isViewAdmin ? `
                    <div class="p-3 border-t border-slate-100 bg-slate-50/30">
                        <button data-action="toggle-interest" data-id="${t.id}" data-interested="${intr}" class="w-full py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${intr
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-900 text-white shadow-md shadow-slate-900/20 hover:bg-slate-800 active:scale-[0.98]'
                }">
                            ${intr
                    ? `<i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Intéressé(e)`
                    : `<span>Rejoindre</span> <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>`
                }
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    };

    // Helper: Render a Direction section with its poles
    const renderDirectionSection = (direction, childPoles = []) => {
        const directionLeaders = leaders ? leaders.filter(l => l.pole_id === direction.id) : [];

        const adminActionsDirection = isViewAdmin ? `
            <div class="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button data-action="add-child-pole" data-parent-id="${direction.id}" class="p-2 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition" title="Ajouter un pôle">
                    <i data-lucide="plus" class="w-4 h-4 pointer-events-none"></i>
                </button>
                <button data-action="edit-pole" data-id="${direction.id}" class="p-2 rounded-lg bg-white text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 transition" title="Modifier">
                    <i data-lucide="pencil" class="w-4 h-4 pointer-events-none"></i>
                </button>
                <button data-action="delete-pole" data-id="${direction.id}" class="p-2 rounded-lg bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition" title="Supprimer">
                    <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                </button>
            </div>
        ` : '';

        return `
            <div class="mb-10" data-direction-id="${direction.id}">
                <!-- Direction Header -->
                <div class="group flex items-center justify-between mb-5 pb-4 border-b-2 border-slate-200">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
                            <i data-lucide="${direction.icon || 'folder'}" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <h2 class="text-xl font-black text-slate-900">${escapeHtml(direction.name)}</h2>
                            ${direction.description ? `<p class="text-sm text-slate-500 mt-0.5">${escapeHtml(direction.description)}</p>` : ''}
                            ${directionLeaders.length > 0 ? `
                                <div class="flex items-center gap-2 mt-2">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase">Dirigé par:</span>
                                    ${directionLeaders.slice(0, 2).map(l => `
                                        <span class="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                            ${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    ${adminActionsDirection}
                </div>

                <!-- Poles Grid -->
                ${childPoles.length > 0 ? `
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        ${childPoles.map(p => renderPoleCard(p)).join('')}
                    </div>
                ` : `
                    <div class="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
                        <i data-lucide="inbox" class="w-8 h-8 text-slate-300 mx-auto mb-2"></i>
                        <p class="text-sm text-slate-400">Aucun pôle dans cette direction</p>
                        ${isViewAdmin ? `
                            <button data-action="add-child-pole" data-parent-id="${direction.id}" class="mt-3 text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 mx-auto">
                                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Ajouter un pôle
                            </button>
                        ` : ''}
                    </div>
                `}
            </div>
        `;
    };

    // Helper: Render the Antenne leadership section (top of page)
    const renderAntenneSection = () => {
        if (antenne.length === 0 && !isViewAdmin) return '';

        // Get all antenne leaders
        const antenneLeaders = antenne.flatMap(a =>
            leaders ? leaders.filter(l => l.pole_id === a.id) : []
        );

        const antenneEntry = antenne[0]; // Usually just one entry

        const adminActions = isViewAdmin ? `
            <div class="flex gap-2">
                ${antenneEntry ? `
                    <button data-action="edit-pole" data-id="${antenneEntry.id}" class="p-2 rounded-lg bg-white/20 text-white/80 hover:text-white hover:bg-white/30 transition" title="Modifier">
                        <i data-lucide="pencil" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                ` : `
                    <button id="btn-create-antenne" class="px-4 py-2 rounded-lg bg-white/20 text-white font-bold hover:bg-white/30 transition flex items-center gap-2">
                        <i data-lucide="plus" class="w-4 h-4"></i> Ajouter
                    </button>
                `}
            </div>
        ` : '';

        return `
            <div class="mb-10 bg-gradient-to-r from-indigo-600 via-brand-600 to-purple-600 rounded-2xl p-6 shadow-xl shadow-brand-500/20 relative overflow-hidden">
                <!-- Background Pattern -->
                <div class="absolute inset-0 opacity-10">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div class="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
                </div>
                
                <div class="relative z-10">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <i data-lucide="crown" class="w-6 h-6 text-white"></i>
                            </div>
                            <div>
                                <h2 class="text-xl font-black text-white">Direction d'Antenne</h2>
                                ${antenneEntry?.description ? `<p class="text-white/80 text-sm">${escapeHtml(antenneEntry.description)}</p>` : ''}
                                ${antenneEntry?.email ? `
                                    <a href="mailto:${antenneEntry.email}" class="inline-flex items-center gap-1.5 text-white/90 hover:text-white text-xs mt-1.5 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition">
                                        <i data-lucide="mail" class="w-3.5 h-3.5"></i>
                                        ${escapeHtml(antenneEntry.email)}
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                        ${adminActions}
                    </div>
                    
                    ${antenneLeaders.length > 0 ? `
                        <div class="flex flex-wrap gap-3 mt-4">
                            ${antenneLeaders.map(l => `
                                <div class="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20">
                                    <div class="w-10 h-10 rounded-full bg-white shadow-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-brand-600 text-sm font-bold">
                                        ${l.photo_url
                ? `<img src="${l.photo_url}" class="w-full h-full object-cover" alt="${l.first_name}">`
                : l.first_name[0].toUpperCase()
            }
                                    </div>
                                    <div>
                                        <p class="text-white font-bold text-sm">${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)}</p>
                                        <p class="text-white/70 text-xs">${escapeHtml(l.role_title || "Directeur·ice d'antenne")}</p>
                                    </div>
                                </div>
        `).join('')}
                        </div>
                    ` : `
                        <p class="text-white/60 text-sm mt-2 italic">Aucun directeur d'antenne assigné</p>
                    `}
                </div>
            </div>
        `;
    };

    // Render all content
    const renderContent = () => {
        if (directions.length === 0 && allTeams.length === 0 && antenne.length === 0) {
            return `
                <div class="rounded-3xl border border-slate-100 bg-white p-16 text-center">
                    <div class="w-24 h-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <i data-lucide="users-round" class="w-10 h-10 text-slate-300"></i>
                    </div>
                    <h3 class="text-2xl font-black text-slate-700">Aucun pôle actif</h3>
                    <p class="text-slate-400 text-sm mt-2">Les pôles apparaîtront ici une fois créés.</p>
                </div>
            `;
        }

        // Render Antenne section first
        let html = renderAntenneSection();

        // Render each direction with its child poles
        html += directions.map(dir => {
            const childPoles = poles[dir.id] || [];
            return renderDirectionSection(dir, childPoles);
        }).join('');

        // Also render orphan poles (poles without a valid parent) - shown as standalone section
        const orphanPoles = allTeams.filter(t => t.parent_id && !directions.find(d => d.id === t.parent_id));
        if (orphanPoles.length > 0) {
            html += `
                <div class="mb-10">
                    <div class="flex items-center gap-3 mb-5 pb-4 border-b-2 border-slate-200">
                        <div class="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500">
                            <i data-lucide="help-circle" class="w-5 h-5"></i>
                        </div>
                        <h2 class="text-lg font-bold text-slate-600">Pôles non classés</h2>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        ${orphanPoles.map(p => renderPoleCard(p)).join('')}
                    </div>
                </div>
            `;
        }

        return html;
    };

    const header = `
        <div class="mb-10 animate-slide-up">
            <div class="flex flex-col gap-3 mb-4">
                <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-100/50 text-brand-700 text-xs font-bold uppercase tracking-wider w-fit border border-brand-200/50">
                    <i data-lucide="network" class="w-4 h-4"></i> Organisation & Pôles
                </div>
            </div>
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">Les Pôles</h1>
                    <p class="text-slate-500 mt-3 text-lg max-w-2xl leading-relaxed">Rejoignez les équipes qui font bouger les choses. Découvrez les responsables et signifiez votre intérêt.</p>
                </div>
                ${isViewAdmin ? `
                    <div class="flex gap-3 flex-shrink-0">
                        <button id="btn-create-direction" class="h-fit bg-white text-brand-600 px-5 py-3 rounded-xl font-bold border-2 border-brand-200 hover:border-brand-400 hover:bg-brand-50 transition flex items-center gap-2">
                            <i data-lucide="folder-plus" class="w-5 h-5"></i>
                            Direction
                        </button>
                        <button id="btn-create-pole" class="h-fit bg-brand-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-brand-500/30 hover:bg-brand-700 hover:shadow-xl active:scale-95 transition flex items-center gap-2">
                            <i data-lucide="plus" class="w-5 h-5"></i>
                            Nouveau Pôle
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    container.innerHTML = `
        <div class="max-w-4xl mx-auto pb-24">
            ${header}
            <div id="poles-content" class="animate-fade-in">
                ${renderContent()}
            </div>
        </div>
    `;

    createIcons({ icons, root: container });

    // 3. Init Modals (Admin Only Listeners mostly)
    if (isViewAdmin) {
        initAdminListeners(container, allTeams, leaders, directions);
    }

    // Common Listeners
    container.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'toggle-interest') {
            const isInterested = btn.dataset.interested === 'true';

            if (!store.state.user?.id) {
                showToast('Connectez-vous pour rejoindre un pôle', 'error');
                return;
            }

            // Optimistic UI Update - NO full re-render (prevents infinite loop!)
            const newInterestState = !isInterested;
            btn.setAttribute('data-interested', newInterestState ? 'true' : 'false');

            // Update button appearance immediately
            if (newInterestState) {
                btn.classList.remove('bg-slate-900', 'text-white', 'shadow-lg', 'shadow-slate-900/20');
                btn.classList.add('bg-emerald-50', 'text-emerald-600', 'border', 'border-emerald-200');
                btn.innerHTML = '<i data-lucide="check-circle-2" class="w-4 h-4"></i> Intéressé(e)';
            } else {
                btn.classList.remove('bg-emerald-50', 'text-emerald-600', 'border', 'border-emerald-200');
                btn.classList.add('bg-slate-900', 'text-white', 'shadow-lg', 'shadow-slate-900/20');
                btn.innerHTML = '<span>Rejoindre</span> <i data-lucide="arrow-right" class="w-4 h-4 group-hover/btn:translate-x-1 transition-transform"></i>';
            }
            createIcons({ icons, root: btn.parentElement });

            // Show immediate feedback
            showToast(newInterestState ? '🎯 Intérêt signalé aux responsables !' : 'Intérêt retiré');

            // Call API in background (fire and forget)
            PolesService.toggleInterest(store.state.user.id, id, isInterested)
                .catch(err => {
                    console.error('Toggle interest error:', err);
                    // Revert UI on error
                    const revertState = !newInterestState;
                    btn.setAttribute('data-interested', revertState ? 'true' : 'false');
                    if (revertState) {
                        btn.classList.remove('bg-emerald-50', 'text-emerald-600', 'border', 'border-emerald-200');
                        btn.classList.add('bg-slate-900', 'text-white', 'shadow-lg', 'shadow-slate-900/20');
                        btn.innerHTML = '<span>Rejoindre</span> <i data-lucide="arrow-right" class="w-4 h-4 group-hover/btn:translate-x-1 transition-transform"></i>';
                    } else {
                        btn.classList.remove('bg-slate-900', 'text-white', 'shadow-lg', 'shadow-slate-900/20');
                        btn.classList.add('bg-emerald-50', 'text-emerald-600', 'border', 'border-emerald-200');
                        btn.innerHTML = '<i data-lucide="check-circle-2" class="w-4 h-4"></i> Intéressé(e)';
                    }
                    createIcons({ icons, root: btn.parentElement });
                    showToast('Erreur lors de la mise à jour', 'error');
                });
        }
    });
}

function initAdminListeners(container, teams, leaders, directions) {
    container.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        const parentId = btn.dataset.parentId;

        if (action === 'delete-pole') {
            const isDirection = directions?.find(d => d.id === id);
            const confirmMsg = isDirection
                ? "⚠️ Supprimer cette Direction ?\nLes pôles enfants deviendront orphelins."
                : "⚠️ Supprimer ce pôle ?\nCela supprimera aussi l'historique des intérêts.";

            showConfirm(confirmMsg, async () => {
                toggleLoader(true);
                try {
                    await PolesService.deleteTeam(id);
                    showToast(isDirection ? "Direction supprimée" : "Pôle supprimé");
                    await renderPoles(container);
                } catch (err) {
                    showToast("Erreur suppression", "error");
                    toggleLoader(false);
                }
            }, { type: 'danger', confirmText: 'Supprimer définitivement' });

        } else if (action === 'view-candidates') {
            const name = btn.dataset.name;
            await openCandidatesModal(id, name);

        } else if (action === 'edit-pole') {
            const team = teams.find(t => t.id == id);
            if (team) openUpsertPoleModal(team, directions);

        } else if (action === 'add-child-pole') {
            // Open modal with parent pre-selected
            openUpsertPoleModal(null, directions, parentId);

        } else if (btn.id === 'btn-create-pole') {
            openUpsertPoleModal(null, directions);

        } else if (btn.id === 'btn-create-direction') {
            // Create a Direction (pole without parent)
            openUpsertPoleModal(null, [], null, true);

        } else if (btn.id === 'btn-create-antenne') {
            // Create the Antenne team (special type)
            openAntenneModal();
        }
    });
}

// =============================================================================
// 👑 MODALE CRÉATION ANTENNE (Direction d'Antenne)
// =============================================================================

async function openAntenneModal() {
    const m = document.createElement('div');
    m.className = 'fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in';

    m.innerHTML = `
        <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl animate-scale-in overflow-hidden flex flex-col max-h-[90vh]" data-modal="create-antenne">
            <!-- Header -->
            <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-br from-indigo-50/80 to-purple-50/50">
                <div>
                    <h3 class="font-black text-2xl text-slate-900 tracking-tight">👑 Direction d'Antenne</h3>
                    <p class="text-sm text-slate-500 font-medium mt-0.5">Configuration de la direction principale</p>
                </div>
                <button class="w-11 h-11 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 shadow-sm border border-slate-100 flex items-center justify-center transition duration-300 btn-close">
                    <i data-lucide="x" class="w-5 h-5 pointer-events-none"></i>
                </button>
            </div>

            <!-- Form Body -->
            <div class="p-6 overflow-y-auto custom-scrollbar space-y-6">
                <form id="form-create-antenne" class="space-y-5">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Nom (optionnel)</label>
                        <input name="name" value="Direction d'Antenne" class="w-full p-3.5 bg-slate-50 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-500 border border-slate-100 placeholder:font-medium" placeholder="Ex: Direction d'Antenne Angers">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                        <textarea name="desc" rows="3" class="w-full p-3.5 bg-slate-50 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 border border-slate-100 placeholder:text-slate-400" placeholder="Décrivez la mission de la direction d'antenne..."></textarea>
                    </div>
                    <input type="hidden" name="team_type" value="antenne">
                    <input type="hidden" name="icon" value="crown">
                </form>
            </div>

            <!-- Footer -->
            <div class="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button class="btn-close px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition">Annuler</button>
                <button form="form-create-antenne" type="submit" class="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:from-indigo-700 hover:to-purple-700 active:scale-95 transition">Créer</button>
            </div>
        </div>
    `;

    document.body.appendChild(m);
    createIcons({ icons, root: m });

    const closeModal = () => m.remove();
    m.querySelectorAll('.btn-close').forEach(b => b.onclick = closeModal);

    const form = m.querySelector('#form-create-antenne');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const data = {
            name: fd.get('name') || "Direction d'Antenne",
            description: fd.get('desc') || null,
            icon: fd.get('icon') || 'crown',
            team_type: 'antenne',
            parent_id: null
        };

        toggleLoader(true);
        try {
            await PolesService.createTeam(data);
            showToast("Direction d'Antenne créée !");
            closeModal();
            const container = document.getElementById('view-container');
            if (container) await renderPoles(container);
            else window.location.reload();
        } catch (err) {
            showToast("Erreur lors de la création", "error");
            console.error(err);
        } finally {
            toggleLoader(false);
        }
    };
}

// =============================================================================
// 🏰 MODALE CRÉATION / MODIFICATION (Premium)
// =============================================================================

async function openUpsertPoleModal(team = null, directions = [], preselectedParentId = null, forceAsDirection = false) {
    const isEdit = !!team;
    const isCreatingDirection = forceAsDirection || (isEdit && !team.parent_id);

    // Fetch current leaders if edit
    let currentLeaders = [];
    if (isEdit) {
        const allLeaders = await PolesService.getLeaders();
        currentLeaders = allLeaders.filter(l => l.pole_id === team.id);
    }

    // Determine selected parent
    const selectedParentId = isEdit ? (team.parent_id || '') : (preselectedParentId || '');

    const m = document.createElement('div');
    m.className = 'fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in';

    // Title based on context
    const modalTitle = isCreatingDirection
        ? (isEdit ? '📁 Modifier la Direction' : '📁 Nouvelle Direction')
        : (isEdit ? '🏰 Modifier le Pôle' : '✨ Nouveau Pôle');

    const modalSubtitle = isCreatingDirection ? 'Catégorie principale' : 'Configuration et équipe';

    m.innerHTML = `
        <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl animate-scale-in overflow-hidden flex flex-col max-h-[90vh]" data-modal="upsert-pole">
            <!-- Header (Premium) -->
            <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-br from-brand-50/80 to-indigo-50/50">
                <div>
                    <h3 class="font-black text-2xl text-slate-900 tracking-tight">${modalTitle}</h3>
                    <p class="text-sm text-slate-500 font-medium mt-0.5">${modalSubtitle}</p>
                </div>
                <button class="w-11 h-11 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 shadow-sm border border-slate-100 flex items-center justify-center transition duration-300 btn-close">
                    <i data-lucide="x" class="w-5 h-5 pointer-events-none"></i>
                </button>
            </div>

            <!-- Form Body -->
            <div class="p-6 overflow-y-auto custom-scrollbar space-y-6">
                <form id="form-upsert-pole" class="space-y-5">
                    
                    <!-- Parent Direction (only for Pôles, not Directions) -->
                    ${!isCreatingDirection && directions.length > 0 ? `
                        <div class="bg-brand-50/30 p-4 rounded-xl border border-brand-100">
                            <label class="block text-xs font-bold text-brand-700 uppercase mb-2">📁 Direction parente</label>
                            <select name="parent_id" class="w-full p-3 bg-white rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 border border-brand-200">
                                <option value="">— Aucune (créer comme Direction) —</option>
                                ${directions.map(d => `
                                    <option value="${d.id}" ${d.id === selectedParentId ? 'selected' : ''}>${escapeHtml(d.name)}</option>
                                `).join('')}
                            </select>
                            <p class="text-[11px] text-brand-600 mt-2">Rattachez ce pôle à une Direction existante</p>
                        </div>
                    ` : `
                        <input type="hidden" name="parent_id" value="">
                    `}
                    
                    <!-- Basic Info -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2">
                             <label class="block text-xs font-bold text-slate-500 uppercase mb-2">${isCreatingDirection ? 'Nom de la Direction' : 'Nom du Pôle'}</label>
                             <input name="name" value="${isEdit ? escapeHtml(team.name) : ''}" class="w-full p-3.5 bg-slate-50 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-500 border border-slate-100 placeholder:font-medium" placeholder="${isCreatingDirection ? 'Ex: Direction des opérations' : 'Ex: Logistique'}" required>
                        </div>
                        <div>
                             <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Icône (Lucide)</label>
                             <div class="relative">
                                <i data-lucide="box" class="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400"></i>
                                <input name="icon" value="${isEdit ? escapeHtml(team.icon || (isCreatingDirection ? 'folder' : 'users')) : (isCreatingDirection ? 'folder' : 'users')}" class="w-full pl-11 p-3.5 bg-slate-50 rounded-xl font-bold text-slate-600 outline-none focus:ring-2 focus:ring-brand-500 border border-slate-100">
                             </div>
                        </div>
                        <div>
                             <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Couleur (Optionnel)</label>
                             <select name="color" class="w-full p-3.5 bg-slate-50 rounded-xl font-bold text-slate-600 outline-none focus:ring-2 focus:ring-brand-500 border border-slate-100">
                                <option value="brand" ${team?.color === 'brand' ? 'selected' : ''}>Bleu (Brand)</option>
                                <option value="emerald" ${team?.color === 'emerald' ? 'selected' : ''}>Émeraude</option>
                                <option value="purple" ${team?.color === 'purple' ? 'selected' : ''}>Violet</option>
                                <option value="orange" ${team?.color === 'orange' ? 'selected' : ''}>Orange</option>
                             </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                        <textarea name="desc" rows="3" class="w-full p-3.5 bg-slate-50 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 border border-slate-100 placeholder:text-slate-400" placeholder="${isCreatingDirection ? 'Décrivez cette direction...' : 'Décrivez la mission de ce pôle...'}">${isEdit ? escapeHtml(team.description || '') : ''}</textarea>
                    </div>

                    <div>
                         <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Email de contact</label>
                         <div class="relative">
                            <i data-lucide="mail" class="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400"></i>
                            <input name="email" type="email" value="${isEdit ? escapeHtml(team.email || '') : ''}" class="w-full pl-11 p-3.5 bg-slate-50 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 border border-slate-100" placeholder="pole@asso.fr">
                         </div>
                    </div>

                    <!-- Responsables Section (Only Edit Mode) -->
                    ${isEdit ? `
                        <div class="pt-4 border-t border-slate-100">
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-3">Responsables actuels</label>
                            
                            <div id="leaders-list" class="space-y-3 mb-4">
                                ${currentLeaders.map(l => `
                                    <div class="bg-white border border-slate-200 p-3 rounded-xl" data-leader-card="${l.id}">
                                        <div class="flex items-center justify-between mb-2">
                                            <div class="flex items-center gap-3">
                                                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden border border-white">
                                                    ${l.photo_url ? `<img src="${l.photo_url}" class="w-full h-full object-cover">` : `<span>${l.first_name[0].toUpperCase()}</span>`}
                                                </div>
                                                <span class="font-bold text-sm text-slate-800">${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)}</span>
                                            </div>
                                            <button type="button" data-remove-leader="${l.id}" class="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition">
                                                <i data-lucide="minus-circle" class="w-5 h-5"></i>
                                            </button>
                                        </div>
                                        <div class="relative">
                                            <i data-lucide="briefcase" class="absolute left-3 top-2.5 w-4 h-4 text-slate-400"></i>
                                            <input type="text" data-leader-title="${l.id}" value="${escapeHtml(l.role_title || 'Responsable')}" placeholder="Ex: Responsable Logistique" class="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-100 focus:ring-2 focus:ring-brand-500 outline-none" data-original-value="${escapeHtml(l.role_title || 'Responsable')}">
                                        </div>
                                    </div>
                                `).join('')}
                                ${currentLeaders.length === 0 ? '<p class="text-xs text-slate-400 italic">Aucun responsable.</p>' : ''}
                            </div>

                            <!-- Search to Add (Premium Visible) -->
                            <div class="relative">
                                <label class="block text-xs font-black text-brand-700 uppercase tracking-wider mb-3">✨ Ajouter un responsable</label>
                                <div class="relative">
                                    <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-500 pointer-events-none"></i>
                                    <input id="leader-search" placeholder="Tapez un nom ou email..." class="w-full pl-11 p-3.5 bg-brand-100/30 border-2 border-brand-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white outline-none transition placeholder:text-brand-600">
                                </div>
                                <div id="search-results" class="hidden absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-2xl rounded-xl mt-2 z-50 max-h-64 overflow-y-auto"></div>
                            </div>
                        </div>
                    ` : '<div class="bg-blue-50 p-3 rounded-xl text-xs text-blue-700 flex gap-2"><i data-lucide="info" class="w-4 h-4"></i> Vous pourrez ajouter des responsables une fois le pôle créé.</div>'}

                </form>
            </div>

            <!--Footer -->
    <div class="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
        <button class="btn-close px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition">Annuler</button>
        <button form="form-upsert-pole" type="submit" class="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 active:scale-95 transition">Enregistrer</button>
    </div>
        </div>
    `;

    document.body.appendChild(m);
    createIcons({ icons, root: m });

    // Events
    const closeModal = () => m.remove();
    m.querySelectorAll('.btn-close').forEach(b => b.onclick = closeModal);
    // Initialize leader changes tracker (before form submit)
    const leaderChanges = {
        toAdd: [],      // { userId, poleId, roleTitle }
        toRemove: [],   // { userId }
        toUpdate: {}    // { userId: newRoleTitle }
    };

    // Form Submit
    const form = m.querySelector('#form-upsert-pole');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const parentIdValue = fd.get('parent_id');
        const data = {
            name: fd.get('name'),
            description: fd.get('desc'),
            icon: fd.get('icon'),
            email: fd.get('email'),
            color: fd.get('color'),
            parent_id: parentIdValue || null  // null = Direction, uuid = Pôle enfant
        };

        toggleLoader(true);
        try {
            // 1. Update pole info
            if (isEdit) {
                await PolesService.updateTeam(team.id, data);
            } else {
                await PolesService.createTeam(data);
            }

            // 2. Apply leader changes (if edit mode)
            if (isEdit) {
                // Remove leaders
                for (const removal of leaderChanges.toRemove) {
                    await PolesService.removeLeader(removal.userId);
                }

                // Add new leaders
                for (const addition of leaderChanges.toAdd) {
                    await PolesService.assignLeader(addition.userId, addition.poleId, addition.roleTitle);
                }

                // Update existing leader titles
                for (const [userId, newTitle] of Object.entries(leaderChanges.toUpdate)) {
                    await PolesService.updateLeaderTitle(userId, newTitle);
                }
            }

            showToast(isEdit ? "Pôle mis à jour" : "Pôle créé");
            closeModal();
            const container = document.getElementById('view-container'); // Hacky but works if standard layout
            if (container) renderPoles(container);
            else window.location.reload();
        } catch (err) {
            showToast("Erreur sauvegarde", "error");
            console.error(err);
        } finally {
            toggleLoader(false);
        }
    };

    // Leader Management (Only in Edit Mode) - Local State Management
    if (isEdit) {
        // Update Leader Role Title (LOCAL ONLY - no immediate API call)
        m.querySelectorAll('[data-leader-title]').forEach(input => {
            input.oninput = () => {
                const uid = input.dataset.leaderTitle;
                const newTitle = input.value.trim() || 'Responsable';
                // Store in local state
                leaderChanges.toUpdate[uid] = newTitle;
                // Visual feedback - change input style
                input.classList.add('ring-2', 'ring-blue-400', 'bg-blue-50');
            };
        });

        // Remove Leader (LOCAL ONLY - mark for removal, don't delete immediately)
        m.querySelectorAll('[data-remove-leader]').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const uid = btn.dataset.removeLeader;

                showConfirm("Retirer ce responsable ?", () => {
                    // Add to removal list
                    leaderChanges.toRemove.push({ userId: uid });

                    // Remove from DOM immediately for UX
                    const leaderCard = btn.closest('[data-leader-card]');
                    if (leaderCard) {
                        leaderCard.style.opacity = '0.5';
                        leaderCard.style.textDecoration = 'line-through';
                    }
                    showToast("Responsable marqué pour suppression");
                }, { type: 'danger', confirmText: 'Retirer' });
            };
        });

        // Search Leader
        const searchInput = m.querySelector('#leader-search');
        const resultsBox = m.querySelector('#search-results');
        let searchTimeout;

        searchInput.oninput = (e) => {
            clearTimeout(searchTimeout);
            const q = e.target.value.trim();
            if (q.length < 2) {
                resultsBox.classList.add('hidden');
                return;
            }

            searchTimeout = setTimeout(async () => {
                const results = await PolesService.searchVolunteers(q);
                resultsBox.innerHTML = results.map(u => `
    <div class="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition" data-add-leader="${u.id}">
                        <div class="flex items-center gap-2">
                             <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold overflow-hidden">
                                ${u.photo_url ? `<img src="${u.photo_url}" class="w-full h-full object-cover">` : u.first_name[0]}
                             </div>
                             <div class="flex flex-col">
                                <span class="text-sm font-bold text-slate-800">${escapeHtml(u.first_name)} ${escapeHtml(u.last_name)}</span>
                                <span class="text-[10px] text-slate-400">${escapeHtml(u.email)}</span>
                             </div>
                        </div>
                        <i data-lucide="plus" class="w-4 h-4 text-brand-600"></i>
                    </div>
    `).join('');
                createIcons({ icons, root: resultsBox });

                if (results.length > 0) resultsBox.classList.remove('hidden');
                else resultsBox.classList.add('hidden');

                // Add Click Event
                resultsBox.querySelectorAll('[data-add-leader]').forEach(row => {
                    row.onclick = () => {
                        const uid = row.dataset.addLeader;
                        const user = {
                            id: uid,
                            first_name: row.querySelector('.text-sm.font-bold').textContent.split(' ')[0],
                            last_name: row.querySelector('.text-sm.font-bold').textContent.split(' ').slice(1).join(' ')
                        };

                        // Open modal with callback for role title
                        openLeaderRoleModal(user, (roleTitle) => {
                            // Add to local changes
                            leaderChanges.toAdd.push({
                                userId: uid,
                                poleId: team.id,
                                roleTitle: roleTitle
                            });
                            showToast(`${user.first_name} sera ajouté(e) au poste "${roleTitle}"`);
                            searchInput.value = ''; // Clear search
                            resultsBox.classList.add('hidden');
                        });
                    };
                });
            }, 300);
        };
    }
}

// =============================================================================
// 🎖️ MODALE TITRE DU POSTE (Responsable)
// =============================================================================

function openLeaderRoleModal(user, onConfirm) {
    const m = document.createElement('div');
    m.className = 'fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in';

    // Handle user object structure variability (db vs search result)
    const userName = `${user.first_name || ''} ${user.last_name || ''} `.trim();

    m.innerHTML = `
    <div class="bg-white w-full max-w-sm rounded-3xl shadow-2xl animate-scale-in p-6 border border-slate-100">
            <!-- Header -->
            <div class="mb-6">
                <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 text-brand-600 mb-3">
                    <i data-lucide="briefcase" class="w-6 h-6"></i>
                </div>
                <h3 class="text-xl font-black text-slate-900">Titre du poste</h3>
                <p class="text-sm text-slate-500 mt-2">Définissez le rôle de <strong class="text-slate-700">${escapeHtml(userName)}</strong></p>
            </div>

            <!--Form -->
            <form id="form-role-title" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Intitulé du poste</label>
                    <div class="relative">
                        <i data-lucide="briefcase" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"></i>
                        <input type="text" name="role_title" placeholder="Ex: Responsable Logistique" value="Responsable" class="w-full pl-11 p-3.5 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white border border-slate-100 transition" required>
                    </div>
                    <p class="text-xs text-slate-400 mt-2 leading-relaxed">Suggestions : Responsable • Coordinateur • Animateur • Référent • Animateur Senior</p>
                </div>
            </form>

            <!--Actions -->
    <div class="flex gap-3 mt-7">
        <button id="btn-cancel-role" class="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition duration-300">Annuler</button>
        <button form="form-role-title" type="submit" class="flex-1 px-4 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition duration-300 active:scale-95">Ajouter</button>
    </div>
        </div>
    `;

    document.body.appendChild(m);
    createIcons({ icons, root: m });

    const closeModal = () => m.remove();
    m.querySelector('#btn-cancel-role').onclick = closeModal;

    const form = m.querySelector('#form-role-title');
    form.onsubmit = (e) => {
        e.preventDefault();
        const roleTitle = form.querySelector('[name="role_title"]').value.trim() || 'Responsable';

        // Calback instead of API call
        if (onConfirm) onConfirm(roleTitle);

        closeModal();
    };
}

// =============================================================================
// 👥 MODALE CANDIDATS (Premium)
// =============================================================================

async function openCandidatesModal(teamId, teamName) {
    toggleLoader(true);
    const candidates = await PolesService.getCandidates(teamId); // Returns { user_id, created_at, profiles: {...} }
    toggleLoader(false);

    const m = document.createElement('div');
    m.className = 'fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';

    const listHtml = candidates.length > 0 ? candidates.map(c => {
        const p = c.profiles;
        const date = new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

        return `
    <div class="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between mb-3 shadow-sm hover:shadow-md transition group gap-3" id="candidate-row-${p.id}">
                 <div class="flex items-center gap-4 min-w-0">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center text-brand-600 font-bold text-lg overflow-hidden">
                        ${p.photo_url
                ? `<img src="${p.photo_url}" class="w-full h-full object-cover">`
                : p.first_name[0]
            }
                    </div>
                    <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                            <h4 class="font-bold text-slate-900 truncate">${escapeHtml(p.first_name)} ${escapeHtml(p.last_name)}</h4>
                            <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium whitespace-nowrap">${date}</span>
                        </div>
                        <div class="text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-0.5">
                            <span class="truncate"><i data-lucide="phone" class="w-3 h-3 inline mr-1"></i> ${escapeHtml(p.phone || '-')}</span>
                            <span class="truncate"><i data-lucide="mail" class="w-3 h-3 inline mr-1"></i> ${escapeHtml(p.email || '-')}</span>
                        </div>
                    </div>
                 </div>

                 <div class="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button data-action="contact-candidate" data-user-id="${p.id}" class="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition" title="Contacter">
                        <i data-lucide="message-circle" class="w-5 h-5"></i>
                    </button>
                    <button data-action="remove-interest" data-user-id="${p.id}" class="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition" title="Retirer de la liste">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                 </div>
            </div> `;
    }).join('') : `
    <div class="flex flex-col items-center justify-center py-16 text-slate-400" >
            <i data-lucide="inbox" class="w-12 h-12 mb-3 text-slate-200"></i>
            <p>Aucun bénévole intéressé pour le moment.</p>
        </div>
    `;

    m.innerHTML = `
    <div class="bg-white w-full max-w-2xl rounded-3xl p-0 h-[75vh] flex flex-col shadow-2xl animate-scale-in relative overflow-hidden mx-4" >
            <!-- Header (Premium) -->
            <div class="bg-gradient-to-br from-brand-50/80 to-indigo-50/50 p-6 border-b border-slate-100 flex justify-between items-start">
                <div class="min-w-0 pr-4">
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100/50 text-brand-700 text-xs font-bold uppercase tracking-wider border border-brand-200/30 mb-2">
                        <i data-lucide="users" class="w-3.5 h-3.5"></i> Recrutement
                    </div>
                    <h3 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight truncate">Intéressés par: ${escapeHtml(teamName)}</h3>
                    <p class="text-slate-500 text-sm mt-1 font-medium truncate">${candidates.length} bénévole${candidates.length > 1 ? 's' : ''} en attente</p>
                </div>
                <button class="bg-white/80 backdrop-blur-sm p-2.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white transition duration-300 btn-close shadow-sm border border-slate-100/50 flex-shrink-0">
                    <i data-lucide="x" class="w-6 h-6 pointer-events-none"></i>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
                ${listHtml}
            </div>
            
            <div class="bg-slate-50 p-4 border-t border-slate-100 text-center text-xs text-slate-500 font-medium">
                <i data-lucide="lightbulb" class="w-4 h-4 inline mr-1 text-amber-500"></i> Cliquez sur l'icône message pour contacter directement.
            </div>
        </div>
    `;

    document.body.appendChild(m);
    createIcons({ icons, root: m });

    m.querySelector('.btn-close').onclick = () => m.remove();

    // Actions
    m.querySelectorAll('[data-action]').forEach(btn => {
        btn.onclick = async () => {
            const uid = btn.dataset.userId;
            const action = btn.dataset.action;

            if (action === 'remove-interest') {
                showConfirm("Retirer ce bénévole de la liste ?\n(Cela décochera son intérêt)", async () => {
                    const row = document.getElementById(`candidate-row-${uid}`);
                    if (row) {
                        row.style.opacity = '0.5';
                        row.style.pointerEvents = 'none';
                    }

                    toggleLoader(true);
                    try {
                        await PolesService.removeCandidateInterest(uid, teamId);
                        showToast("Intérêt retiré");
                        // Remove locally
                        if (row) {
                            row.classList.add('transition-all', 'duration-500', 'translate-x-full', 'opacity-0');
                            setTimeout(() => row.remove(), 500);
                        }
                    } catch (e) {
                        showToast("Erreur lors de la suppression", "error");
                        if (row) {
                            row.style.opacity = '1';
                            row.style.pointerEvents = 'auto';
                        }
                    } finally {
                        toggleLoader(false);
                    }
                }, { type: 'danger', confirmText: 'Retirer', title: 'Confirmation' });
            }

            if (action === 'contact-candidate') {
                toggleLoader(true);
                try {
                    const profileData = candidates.find(c => c.user_id === uid)?.profiles;
                    const fullName = `${profileData?.first_name} ${profileData?.last_name} `;
                    const messageContent = `Bonjour ${profileData?.first_name}, \n\nJe te contacte suite à ton intérêt pour le pôle ${teamName}.`;

                    // Create or get existing conversation
                    const res = await ChatService.createTicketByUser(uid, `Candidature Pôle: ${teamName} `, messageContent);

                    // Close modal and navigate to messages
                    m.remove();
                    toggleLoader(false);

                    // Force navigation to messages
                    if (res && (res.ticketId || res.id)) {
                        // Update store to indicate we should open this ticket
                        if (store.state) {
                            store.state.selectedTicketId = res.ticketId || res.id;
                        }
                    }

                    // Navigate to messages page
                    window.history.pushState({}, '', '/messages');
                    const { router } = await import('../../core/router.js');
                    if (router && router.handleLocation) {
                        router.handleLocation();
                    } else {
                        // Fallback: reload page
                        setTimeout(() => location.reload(), 100);
                    }

                    showToast('💬 Conversation ouverte!');
                } catch (err) {
                    console.error('Contact candidate error:', err);
                    toggleLoader(false);
                    showToast("Erreur lors de l'ouverture du tchat", "error");
                }
            }
        };
    });
}

