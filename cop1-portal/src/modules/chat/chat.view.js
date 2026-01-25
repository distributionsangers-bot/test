import { ChatService } from './chat.service.js';
import { store } from '../../core/store.js';
import { showToast, toggleLoader, escapeHtml, formatDate, showConfirm } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';

// --- STATE ---
let currentTicketId = null;
let realtimeSubscription = null;
let ticketsCache = [];
let clickHandler = null;

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '✅', '👏', '🎉', '💪', '👋'];

// --- PUBLIC API ---

export async function initChat() {
    cleanup();
    currentTicketId = null;
    ticketsCache = [];
}

export async function renderChat(container, params = {}) {
    const isAdmin = !!(store.state.profile?.is_admin && store.state.adminMode);

    // LAYOUT MOBILE FIX:
    // Mobile: h-[calc(100dvh-85px)] pour éviter d'aller sous la navbar (env. 80px)
    // Input fixed au dessus de la navbar sur mobile.

    container.innerHTML = `
        <!-- Main Container -->
        <div class="relative h-[calc(100dvh-85px)] md:h-[calc(100vh-64px)] w-full overflow-hidden flex flex-col md:flex-row md:bg-white/60 md:backdrop-blur-xl md:rounded-3xl md:border md:border-white/50 md:shadow-2xl">
            
            <!-- Animated Blobs Background (Desktop only optimization) -->
            <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40 hidden md:block">
                <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200 rounded-full blur-[80px] animate-blob"></div>
                <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200 rounded-full blur-[80px] animate-blob animation-delay-2000"></div>
            </div>

            <!-- LEFT PANEL: LIST -->
            <div id="chat-list-panel" class="absolute md:relative inset-0 z-20 w-full h-full flex flex-col bg-slate-50 md:bg-white/80 md:backdrop-blur-xl md:bg-transparent md:border-r border-white/40 transition-transform duration-300 ${params.id ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}">
                
                <!-- List Header -->
                <div class="px-5 py-5 pt-safe flex justify-between items-center bg-gradient-to-br from-brand-600 to-brand-500 shadow-lg shadow-brand-500/20 md:rounded-tl-2xl flex-shrink-0 z-10">
                    <div>
                        <h1 class="font-extrabold text-2xl text-white tracking-tight flex items-center gap-2">
                            <i data-lucide="message-circle" class="w-6 h-6 text-brand-100"></i>
                            Messages
                        </h1>
                        <p class="text-xs font-medium text-brand-100 uppercase tracking-widest mt-0.5 opacity-90">Vos échanges</p>
                    </div>
                    <button id="btn-new-ticket" class="w-10 h-10 rounded-full bg-white text-brand-600 border border-white/50 flex items-center justify-center hover:bg-brand-50 transition active:scale-95 shadow-lg">
                        <i data-lucide="plus" class="w-5 h-5 font-bold"></i>
                    </button>
                </div>

                <!-- List Content -->
                <div id="tickets-container" class="flex-1 overflow-y-auto no-scrollbar py-2 space-y-1 px-2 bg-slate-50/50">
                    ${renderSkeletonList()}
                </div>
            </div>

            <!-- RIGHT PANEL: CONVERSATION -->
            <div id="chat-conversation-panel" class="absolute md:relative inset-0 z-30 w-full h-full flex flex-col bg-white transition-transform duration-300 ${params.id ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}">
                
                <!-- Desktop Empty State -->
                <div id="chat-empty-state" class="hidden md:flex absolute inset-0 flex-col items-center justify-center text-center p-8 z-0 bg-white">
                    <div class="w-24 h-24 bg-gradient-to-br from-slate-100 to-white rounded-3xl shadow-xl flex items-center justify-center mb-6 rotate-3">
                        <i data-lucide="message-square" class="w-10 h-10 text-slate-300"></i>
                    </div>
                    <h2 class="text-xl font-bold text-slate-800 mb-2">Sélectionnez une conversation</h2>
                    <p class="text-slate-400 text-sm">Choisissez un échange dans la liste à gauche</p>
                </div>

                <!-- Active Conversation -->
                <div id="active-conversation-wrapper" class="flex flex-col h-full w-full relative z-10 bg-white ${!params.id ? 'hidden' : ''}">
                    
                    <!-- Chat Header -->
                    <div id="chat-header" class="px-4 py-3 pt-safe bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-sm flex items-center justify-between flex-shrink-0 z-20">
                        <!-- Filled by JS -->
                    </div>
                    
                    <!-- Actions Container Overlay (Dropdown) -->
                    <div id="chat-options-dropdown" class="absolute right-4 top-14 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 hidden transform origin-top-right transition-all z-50">
                        <div id="ticket-actions-container"></div>
                    </div>

                    <!-- Messages Area -->
                    <!-- Padding bottom extra sur mobile pour contrer l'input fixed -->
                    <div id="messages-container" class="flex-1 overflow-y-auto px-4 py-4 overscroll-contain space-y-4 scroll-smooth bg-slate-50 pb-24 md:pb-4">
                        <!-- Messages loaded here -->
                    </div>

                    <!-- Input Area -->
                    <!-- MOBILE: Fixed bottom-0 above nav (z-60) -->
                    <!-- DESKTOP: Normal flow (z-30) -->
                    <form id="chat-input-form" class="
                        fixed bottom-[85px] left-0 right-0 z-[60] 
                        md:relative md:bottom-auto md:z-30 md:left-auto md:right-auto
                        flex-shrink-0 bg-white border-t border-slate-200 px-3 py-3 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] md:shadow-none
                    ">
                        <div class="flex items-end gap-2 max-w-4xl mx-auto">
                            <!-- Emoji Button -->
                            <button type="button" id="btn-emoji" class="w-10 h-10 text-slate-400 hover:text-amber-500 rounded-full flex items-center justify-center transition flex-shrink-0 hover:bg-slate-50">
                                <i data-lucide="smile" class="w-6 h-6"></i>
                            </button>

                            <!-- Input Field -->
                            <div class="flex-1 bg-slate-100 rounded-[24px] border border-transparent focus-within:border-brand-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/10 transition-all">
                                <input id="message-input" type="text" autocomplete="off" placeholder="Message..." 
                                    class="w-full px-4 py-2.5 bg-transparent text-[15px] text-slate-800 placeholder-slate-400 outline-none leading-relaxed">
                            </div>

                            <!-- Emoji Picker -->
                            <div id="emoji-picker" class="absolute bottom-full left-2 mb-2 p-3 bg-white rounded-2xl shadow-2xl border border-slate-100 hidden z-50 animate-slide-up origin-bottom-left w-64">
                                <div class="grid grid-cols-6 gap-1">
                                    ${EMOJI_LIST.map(e => `<button type="button" class="emoji-btn w-9 h-9 text-lg hover:bg-slate-100 rounded-lg transition flex items-center justify-center active:scale-90">${e}</button>`).join('')}
                                </div>
                            </div>
                            
                            <!-- Send Button -->
                            <button type="submit" id="btn-send" class="w-10 h-10 bg-brand-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-brand-700 transition active:scale-90 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                                <i data-lucide="send-horizontal" class="w-5 h-5 ml-0.5"></i>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Initialize Components
    appendNewTicketModal(isAdmin);
    createIcons({ icons, root: container });
    setupEventListeners(container);

    // Initial Load
    await loadTicketsList();

    // Auto-open if param
    if (params.id) {
        await openTicket(params.id);
    }
}

export function cleanup() {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
        realtimeSubscription = null;
    }
    if (clickHandler) {
        document.removeEventListener('click', clickHandler);
        clickHandler = null;
    }
}

// --- CORE FUNCTIONS (Extracted) ---

async function loadTicketsList() {
    const container = document.getElementById('tickets-container');
    if (!container) return;

    const { data: tickets, error } = await ChatService.getTickets();

    if (error) {
        renderErrorState(container);
        return;
    }

    ticketsCache = tickets || [];

    if (!tickets || tickets.length === 0) {
        renderEmptyListState(container);
        return;
    }

    container.innerHTML = tickets.map(t => renderTicketItem(t)).join('');
    createIcons({ icons, root: container });
}

async function openTicket(id) {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
        realtimeSubscription = null;
    }
    currentTicketId = id;

    // UI Updates
    document.getElementById('chat-empty-state')?.classList.add('hidden');
    const activeWrapper = document.getElementById('active-conversation-wrapper');
    activeWrapper?.classList.remove('hidden', 'opacity-0', 'pointer-events-none');

    // Update List Active State
    document.querySelectorAll('.ticket-item').forEach(el => {
        const isActive = el.dataset.ticketId === id;
        el.className = `ticket-item w-full group relative flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer ${isActive ? 'bg-white shadow-md ring-1 ring-black/5' : 'hover:bg-white/50 hover:shadow-sm border border-transparent'}`;
        // Update marker
        const marker = el.querySelector('.absolute.left-0');
        if (isActive && !marker) {
            el.insertAdjacentHTML('beforeend', '<div class="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-brand-500 rounded-r-full"></div>');
        } else if (!isActive && marker) {
            marker.remove();
        }
    });

    // Loading State
    const msgContainer = document.getElementById('messages-container');
    msgContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full animate-pulse">
            <div class="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mb-4"></div>
            <p class="text-xs font-bold text-brand-300 uppercase tracking-widest">Chargement</p>
        </div>
    `;

    // Fetch Data
    const { data: messages, error } = await ChatService.getMessages(id);
    const ticket = ticketsCache.find(t => t.id === id) || (await ChatService.getTickets()).data?.find(t => t.id === id);

    if (error || !ticket) {
        msgContainer.innerHTML = `<div class="text-center py-10 text-red-500 font-bold">Erreur conversion introuvable</div>`;
        return;
    }

    // Update Header & Messages
    updateChatHeader(ticket);
    renderMessages(msgContainer, messages);

    // Realtime Subs
    realtimeSubscription = ChatService.subscribeToTicket(id, (newMsg) => {
        appendMessage(msgContainer, newMsg, true);
    });
}

function updateChatHeader(ticket) {
    const container = document.getElementById('chat-header');

    // Fill Header Info
    const isAnnouncement = ticket.category === 'announcement';
    const isClosed = ticket.status === 'closed';
    const isAdmin = store.state.profile?.is_admin && store.state.adminMode;
    const isOwner = ticket.user_id === store.state.user.id;

    let icon = isAnnouncement ? 'megaphone' : 'message-circle';
    let colorClass = isAnnouncement ? 'bg-amber-100 text-amber-600' : 'bg-brand-100 text-brand-600';

    container.innerHTML = `
        <div class="flex items-center gap-3 overflow-hidden">
             <button id="btn-back-list" class="md:hidden w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-full transition active:scale-95 -ml-2">
                <i data-lucide="chevron-left" class="w-6 h-6"></i>
            </button>
            <div class="w-10 h-10 ${colorClass} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <i data-lucide="${icon}" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0 flex flex-col">
                <h2 class="font-bold text-slate-800 text-sm truncate leading-tight">${escapeHtml(ticket.subject)}</h2>
                <div class="flex items-center gap-2">
                     <span class="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 rounded-md uppercase tracking-wide">
                        ${isAnnouncement ? 'Annonce' : 'Support'}
                     </span>
                     ${isClosed ? '<span class="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><i data-lucide="check-circle-2" class="w-3 h-3"></i> Résolu</span>' : ''}
                </div>
            </div>
        </div>
        
         <div class="relative">
            <button id="btn-chat-options" class="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
                <i data-lucide="more-vertical" class="w-5 h-5"></i>
            </button>
        </div>
    `;

    // Update Dropdown Overlay Content
    const actionContainer = document.getElementById('ticket-actions-container');
    let actionsHtml = '';

    if (isAdmin && !isClosed) {
        actionsHtml += `
            <button id="btn-close-ticket" class="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 transition">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
                Marquer résolu
            </button>
        `;
    }

    actionsHtml += `
        <button id="btn-delete-ticket-action" class="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
            Supprimer
        </button>
    `;

    if (actionContainer) {
        actionContainer.innerHTML = actionsHtml;

        // Bind Action Listeners
        document.getElementById('btn-close-ticket')?.addEventListener('click', () => {
            document.getElementById('chat-options-dropdown')?.classList.add('hidden');
            handleCloseTicket(ticket.id);
        });
        document.getElementById('btn-delete-ticket-action')?.addEventListener('click', () => {
            document.getElementById('chat-options-dropdown')?.classList.add('hidden');
            handleDeleteTicket(ticket.id);
        });
    }

    // Bind Back Button
    document.getElementById('btn-back-list')?.addEventListener('click', () => {
        document.getElementById('chat-list-panel').classList.remove('-translate-x-full');
        document.getElementById('chat-conversation-panel').classList.add('translate-x-full');
        currentTicketId = null;
    });

    createIcons({ icons, root: container });
    if (actionContainer) createIcons({ icons, root: actionContainer });
}

// --- EVENT HANDLERS ---

function setupEventListeners(container) {
    if (clickHandler) document.removeEventListener('click', clickHandler);

    clickHandler = (e) => {
        // Global Delegation

        // New Ticket Button
        if (e.target.closest('#btn-new-ticket')) {
            document.getElementById('create-ticket-modal')?.classList.remove('hidden');
        }

        // Chat Options Dropdown Toggle
        if (e.target.closest('#btn-chat-options')) {
            const menu = document.getElementById('chat-options-dropdown');
            menu?.classList.toggle('hidden');
            e.stopPropagation(); // prevent immediate close by outside click
        } else if (!e.target.closest('#chat-options-dropdown')) {
            document.getElementById('chat-options-dropdown')?.classList.add('hidden');
        }

        // Ticket Selection in List
        const ticketItem = e.target.closest('.ticket-item');
        if (ticketItem) {
            // Check if delete button (hover icon)
            if (e.target.closest('.btn-delete-item')) {
                handleDeleteTicket(ticketItem.dataset.ticketId);
                e.stopPropagation();
                return;
            }

            // Open Ticket
            const id = ticketItem.dataset.ticketId;
            if (window.innerWidth < 768) {
                // Mobile transition
                document.getElementById('chat-list-panel').classList.add('-translate-x-full');
                document.getElementById('chat-conversation-panel').classList.remove('translate-x-full');
            }
            openTicket(id);
        }

        // Type Selectors in Create Modal
        if (e.target.closest('.btn-type-select')) {
            const btn = e.target.closest('.btn-type-select');
            updateTypeSelect(btn);
        }

        // Close Modal
        if (e.target.closest('#btn-close-modal') || e.target.id === 'create-ticket-modal') {
            document.getElementById('create-ticket-modal')?.classList.add('hidden');
        }
    };

    document.addEventListener('click', clickHandler);

    // Form Submissions
    document.getElementById('chat-input-form')?.addEventListener('submit', handleSendMessage);
    const createForm = document.getElementById('form-create-ticket');
    // Important: Re-bind this if modal was re-created
    // But modal is global, handled below.
    document.addEventListener('submit', (e) => {
        if (e.target.id === 'form-create-ticket') handleCreateTicket(e);
    });

    // Emoji Picker Toggles
    const emojiBtn = document.getElementById('btn-emoji');
    const emojiPicker = document.getElementById('emoji-picker');
    emojiBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPicker.classList.toggle('hidden');
    });

    // Emoji Selection
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById('message-input');
            input.value += btn.textContent;
            input.focus();
            emojiPicker.classList.add('hidden');
        });
    });
}

// --- LOGIQUE SUPPRESSION (NEW) ---

function handleDeleteTicket(ticketId) {
    const isAdmin = store.state.profile?.is_admin && store.state.adminMode;

    if (isAdmin) {
        // ADMIN: Choix entre masquer et supprimer
        showDeleteOptionsModal(ticketId);
    } else {
        // BENEVOLE: Masquer uniquement (Soft Delete for user)
        showConfirm("Voulez-vous retirer cette conversation de votre liste ?", async () => {
            toggleLoader(true);
            const res = await ChatService.hideTicket(ticketId);
            toggleLoader(false);
            if (res.success) {
                removeTicketFromUI(ticketId);
                showToast("Conversation masquée");
            } else {
                showToast("Erreur", "error");
            }
        }, { confirmText: 'Retirer', type: 'danger' });
    }
}

function showDeleteOptionsModal(ticketId) {
    // Custom Modal for Admin Choices
    const existing = document.getElementById('admin-delete-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'admin-delete-modal';
    modal.className = 'fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-scale-in">
            <div class="flex items-center gap-3 mb-4 text-red-600">
                <div class="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                    <i data-lucide="trash-2" class="w-6 h-6"></i>
                </div>
                <h3 class="font-bold text-lg">Supprimer la conversation ?</h3>
            </div>
            <p class="text-slate-500 text-sm mb-6">En tant qu'administrateur, vous avez deux options :</p>
            
            <div class="space-y-3">
                <button id="btn-admin-soft-delete" class="w-full p-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-left group transition">
                    <div class="font-bold text-slate-800">Masquer pour moi</div>
                    <div class="text-xs text-slate-400 group-hover:text-slate-500">Ne sera plus visible dans ma liste, mais reste en base.</div>
                </button>

                <button id="btn-admin-hard-delete" class="w-full p-4 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 text-left group transition">
                    <div class="font-bold text-red-800">Supprimer définitivement</div>
                    <div class="text-xs text-red-400 group-hover:text-red-500">Supprime le ticket et les messages pour TOUT LE MONDE. Irréversible.</div>
                </button>
            </div>

            <button id="btn-cancel-delete" class="mt-6 w-full py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition">Annuler</button>
        </div>
    `;

    document.body.appendChild(modal);
    createIcons({ icons, root: modal });

    // Handlers
    modal.querySelector('#btn-cancel-delete').addEventListener('click', () => modal.remove());

    modal.querySelector('#btn-admin-soft-delete').addEventListener('click', async () => {
        modal.remove();
        toggleLoader(true);
        const res = await ChatService.hideTicket(ticketId);
        toggleLoader(false);
        if (res.success) {
            removeTicketFromUI(ticketId);
            showToast("Conversation masquée");
        } else showToast("Erreur", "error");
    });

    modal.querySelector('#btn-admin-hard-delete').addEventListener('click', async () => {
        modal.remove();
        toggleLoader(true);
        const res = await ChatService.deleteTicket(ticketId);
        toggleLoader(false);
        if (res.success) {
            removeTicketFromUI(ticketId);
            showToast("Conversation supprimée");
        } else showToast("Erreur suppression", "error");
    });
}

function removeTicketFromUI(id) {
    if (currentTicketId === id) {
        currentTicketId = null;
        // Desktop: Show empty state
        document.getElementById('active-conversation-wrapper')?.classList.add('hidden');
        document.getElementById('chat-empty-state')?.classList.remove('hidden');
        // Mobile: Go back list
        document.getElementById('chat-list-panel')?.classList.remove('-translate-x-full');
        document.getElementById('chat-conversation-panel')?.classList.add('translate-x-full');
    }
    // Remove from DOM and Cache
    document.querySelector(`.ticket-item[data-ticket-id="${id}"]`)?.remove();
    ticketsCache = ticketsCache.filter(t => t.id !== id);
}

// --- OTHER HANDLERS ---

async function handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('message-input');
    const content = input?.value.trim();
    if (!content || !currentTicketId) return;

    input.value = ''; // Optimistic clear

    const res = await ChatService.sendMessage(currentTicketId, content);
    if (res.error) {
        showToast("Échec envoi", "error");
        input.value = content;
    }
}

async function handleCloseTicket(id) {
    showConfirm("Marquer comme résolu ?", async () => {
        toggleLoader(true);
        await ChatService.closeTicket(id);
        toggleLoader(false);
        showToast("Ticket résolu");
        openTicket(id); // Reload to see status update
    });
}

async function handleCreateTicket(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const type = fd.get('type');
    const targetUserId = fd.get('target_user_id');
    const subject = fd.get('subject');
    const content = fd.get('content');

    if (type === 'direct' && !targetUserId) {
        showToast("Sélectionnez un bénévole", "error");
        return;
    }

    toggleLoader(true);
    let res;
    if (type === 'announcement') res = await ChatService.createAnnouncement(subject, content);
    else if (type === 'direct') res = await ChatService.createDirectMessage(targetUserId, subject, content);
    else res = await ChatService.createTicket(subject, content);
    toggleLoader(false);

    if (res.error) {
        showToast(res.error.message || "Erreur", "error");
        return;
    }

    document.getElementById('create-ticket-modal').classList.add('hidden');
    e.target.reset();
    showToast("Conversation créée");
    loadTicketsList();
}

function updateTypeSelect(btn) {
    document.querySelectorAll('.btn-type-select').forEach(b => {
        b.className = 'btn-type-select py-2.5 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition';
    });
    btn.className = 'btn-type-select py-2.5 text-xs font-bold rounded-lg bg-white text-slate-800 shadow-sm ring-1 ring-black/5 transition';
    const type = btn.dataset.type;
    document.getElementById('input-ticket-type').value = type;

    const wrapper = document.getElementById('volunteer-selector-wrapper');
    if (wrapper) {
        if (type === 'direct') {
            wrapper.classList.remove('hidden');
        } else {
            wrapper.classList.add('hidden');
        }
    }
}

// --- RENDERING HELPERS (Simplified) ---

function renderSkeletonList() {
    return Array(5).fill(0).map(() => `
        <div class="flex items-center gap-4 p-3 rounded-2xl bg-white/40 animate-pulse">
            <div class="w-12 h-12 bg-slate-200/50 rounded-full flex-shrink-0"></div>
            <div class="flex-1 space-y-2">
                <div class="h-3 bg-slate-200/50 rounded w-2/3"></div>
                <div class="h-2.5 bg-slate-100/50 rounded w-full"></div>
            </div>
        </div>
    `).join('');
}

function renderTicketItem(t) {
    const isAnnouncement = t.category === 'announcement';
    const isActive = currentTicketId === t.id;
    const preview = t.last_message ? escapeHtml(t.last_message).slice(0, 35) + '...' : 'Nouvelle conversation';

    // Avatar construction
    let avatarHtml = '';

    if (isAnnouncement) {
        avatarHtml = `
            <div class="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <i data-lucide="megaphone" class="w-5 h-5"></i>
            </div>
        `;
    } else {
        // Initials Logic
        let initials = '?';
        if (t.profiles) {
            const first = t.profiles.first_name?.[0] || '';
            const last = t.profiles.last_name?.[0] || '';
            initials = (first + last).toUpperCase() || '?';
        }

        avatarHtml = `
            <div class="w-10 h-10 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-sm border border-brand-200">
                ${initials}
            </div>
        `;
    }

    return `
        <div class="ticket-item w-full group relative flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer ${isActive ? 'bg-white shadow-md ring-1 ring-black/5' : 'hover:bg-white/50 hover:shadow-sm border border-transparent'}" data-ticket-id="${t.id}">
            
            ${avatarHtml}
            
            <!-- Content -->
            <div class="flex-1 min-w-0 pr-8">
                <div class="flex items-center justify-between gap-1">
                    <span class="font-bold text-[13px] text-slate-800 truncate ${isActive ? 'text-brand-700' : ''}">${escapeHtml(t.subject)}</span>
                    <span class="text-[10px] font-semibold text-slate-400 flex-shrink-0">Now</span>
                </div>
                <div class="flex items-center justify-between gap-2">
                    <span class="text-xs text-slate-500 truncate font-medium group-hover:text-slate-600 transition-colors">${preview}</span>
                    ${t.status === 'closed' ? '<div class="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Résolu"></div>' : ''}
                </div>
            </div>

            <!-- Delete Button (Visible on hover desktop, always on touch if we could but here simpler) -->
            <button class="btn-delete-item absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-white transition-all z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100" title="Supprimer">
                 <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
            
            ${isActive ? '<div class="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-brand-500 rounded-r-full"></div>' : ''}
        </div>
    `;
}

function renderMessages(container, messages) {
    if (!messages.length) {
        container.innerHTML = `<div class="text-center opacity-50 py-10">Aucun message</div>`;
        return;
    }
    container.innerHTML = '<div></div>'; // Clear
    messages.forEach(msg => appendMessage(container, msg, false));
    setTimeout(() => container.scrollTop = container.scrollHeight, 50);
}

function appendMessage(container, msg, scroll) {
    const isMine = msg.user_id === store.state.user?.id;
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const html = isMine
        ? `<div class="flex justify-end mt-4 animate-scale-in"><div class="max-w-[80%] bg-brand-600 text-white px-4 py-2 rounded-2xl rounded-tr-sm shadow-md text-sm">${escapeHtml(msg.content)}<p class="text-[9px] text-white/70 text-right mt-1">${time}</p></div></div>`
        : `<div class="flex justify-start mt-4 animate-scale-in"><div class="max-w-[80%] bg-white text-slate-800 border border-slate-100 px-4 py-2 rounded-2xl rounded-tl-sm shadow-sm text-sm">${escapeHtml(msg.content)}<p class="text-[9px] text-slate-400 mt-1">${time}</p></div></div>`;

    const div = document.createElement('div');
    div.innerHTML = html;
    container.appendChild(div.firstElementChild);

    if (scroll) container.scrollTop = container.scrollHeight;
}

function renderErrorState(container) {
    container.innerHTML = `<div class="text-center py-10 text-red-400">Erreur de chargement</div>`;
}
function renderEmptyListState(container) {
    container.innerHTML = `<div class="text-center py-10 text-slate-400">Aucune conversation</div>`;
}

// Reuse helper for Modal
async function appendNewTicketModal(isAdmin) {
    let volunteersHtml = '';
    if (isAdmin) {
        try {
            const res = await ChatService.getAllVolunteers();
            const volunteers = res.data || [];

            if (volunteers && volunteers.length > 0) {
                volunteersHtml = `
                <div id="volunteer-selector-wrapper" class="hidden animate-fade-in">
                    <label class="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-wider">Destinataire</label>
                    <div class="relative group">
                        <i data-lucide="search" class="absolute left-3 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition"></i>
                        <input type="text" id="volunteer-search" placeholder="Rechercher un bénévole..." 
                            class="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-semibold border border-slate-200 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition">
                    </div>
                     <div id="volunteers-dropdown" class="mt-2 max-h-48 overflow-y-auto bg-white border border-slate-100 rounded-xl shadow-xl hidden custom-scrollbar">
                        ${volunteers.map(v => `
                            <button type="button" class="volunteer-option w-full text-left px-4 py-3 hover:bg-brand-50 transition flex items-center gap-3 border-b border-slate-50 last:border-0" data-id="${v.id}" data-name="${v.first_name || ''} ${v.last_name || ''}">
                                <div class="w-8 h-8 bg-gradient-to-br from-brand-100 to-indigo-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-black shadow-sm flex-shrink-0">
                                    ${(v.first_name || '?')[0].toUpperCase()}
                                </div>
                                <div class="min-w-0">
                                    <div class="text-sm font-bold text-slate-700 truncate">${v.first_name || ''} ${v.last_name || ''}</div>
                                    <div class="text-[10px] text-slate-400 truncate">${v.email}</div>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                    <input type="hidden" name="target_user_id" id="input-target-user">
                    <div id="selected-volunteer" class="hidden mt-3 p-3 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-between">
                        <div class="flex items-center gap-2">
                             <div class="w-2 h-2 rounded-full bg-brand-500"></div>
                             <span class="text-sm font-bold text-brand-700" id="selected-volunteer-name"></span>
                        </div>
                        <button type="button" id="btn-clear-volunteer" class="w-6 h-6 rounded-full hover:bg-brand-100 text-brand-500 flex items-center justify-center transition">
                            <i data-lucide="x" class="w-3 h-3"></i>
                        </button>
                    </div>
                </div>
            `;
            }
        } catch (e) {
            console.error("Error loading volunteers:", e);
        }
    }

    document.getElementById('create-ticket-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'create-ticket-modal';
    modal.className = 'fixed inset-0 bg-slate-900/60 z-[100] flex items-end md:items-center justify-center backdrop-blur-sm hidden animate-fade-in';

    modal.innerHTML = `
        <div class="bg-white w-full md:max-w-lg md:rounded-3xl rounded-t-3xl p-6 pb-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-6">
                <div>
                     <h3 class="font-black text-2xl text-slate-800 tracking-tight">Nouvelle discussion</h3>
                     <p class="text-slate-500 text-sm font-medium">Commencez un échange</p>
                </div>
                <button type="button" id="btn-close-modal" class="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 hover:rotate-90 transition duration-300">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            
            <form id="form-create-ticket" class="space-y-5">
                ${isAdmin ? `
                <div class="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-xl">
                    <button type="button" data-type="support" class="btn-type-select py-2.5 text-xs font-bold rounded-lg bg-white text-slate-800 shadow-sm ring-1 ring-black/5 transition">💬 Support</button>
                    <button type="button" data-type="direct" class="btn-type-select py-2.5 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition">👤 Direct</button>
                    <button type="button" data-type="announcement" class="btn-type-select py-2.5 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition">📢 Annonce</button>
                    <input type="hidden" name="type" id="input-ticket-type" value="support">
                </div>
                ${volunteersHtml}
                ` : '<input type="hidden" name="type" value="support">'}

                <div class="space-y-1">
                     <label class="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Sujet</label>
                     <input name="subject" placeholder="Ex: Question sur le planning..." required 
                        class="w-full px-4 py-3.5 bg-slate-50 rounded-xl text-sm font-semibold border border-slate-200 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition">
                </div>
                
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Message</label>
                    <textarea name="content" rows="4" placeholder="Votre message..." required 
                        class="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium border border-slate-200 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition resize-none"></textarea>
                </div>

                <div class="pt-2">
                    <button type="submit" class="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-base rounded-2xl shadow-lg shadow-brand-500/30 hover:shadow-xl hover:scale-[1.02] transition active:scale-[0.98] flex items-center justify-center gap-2">
                        <span>Créer la conversation</span>
                        <i data-lucide="arrow-right" class="w-5 h-5"></i>
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    createIcons({ icons, root: modal });
    if (isAdmin) setupVolunteerSearch(modal);
}

function setupVolunteerSearch(modal) {
    const searchInput = modal.querySelector('#volunteer-search');
    const dropdown = modal.querySelector('#volunteers-dropdown');
    const options = modal.querySelectorAll('.volunteer-option');
    const selectedDiv = modal.querySelector('#selected-volunteer');
    const selectedName = modal.querySelector('#selected-volunteer-name');
    const clearBtn = modal.querySelector('#btn-clear-volunteer');
    const hiddenInput = modal.querySelector('#input-target-user');

    if (!searchInput || !dropdown) return;

    searchInput.addEventListener('focus', () => dropdown.classList.remove('hidden'));
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        options.forEach(opt => {
            const name = opt.dataset.name.toLowerCase();
            opt.classList.toggle('hidden', !name.includes(query));
        });
        dropdown.classList.remove('hidden');
    });

    options.forEach(opt => {
        opt.addEventListener('click', () => {
            hiddenInput.value = opt.dataset.id;
            selectedName.textContent = opt.dataset.name;
            selectedDiv.classList.remove('hidden');
            dropdown.classList.add('hidden');
            searchInput.value = '';
        });
    });

    clearBtn?.addEventListener('click', () => {
        hiddenInput.value = '';
        selectedDiv.classList.add('hidden');
    });

    // Close on click outside is handled by main clickHandler
}
