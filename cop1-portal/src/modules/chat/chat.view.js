import { ChatService } from './chat.service.js';
import { store } from '../../core/store.js';
import { showToast, toggleLoader, escapeHtml, formatDate, showConfirm } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';

// État local du module
let currentTicketId = null;
let realtimeSubscription = null;

// Emoji picker data (subset)
const EMOJI_LIST = ['😀', '😂', '😍', '🥳', '👍', '👏', '🙏', '❤️', '🔥', '✅', '⭐', '💪', '🎉', '👋', '🤔', '😊'];

export async function initChat() {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
        realtimeSubscription = null;
    }
    currentTicketId = null;
}

export async function renderChat(container, params = {}) {
    const isAdmin = store.state.profile?.is_admin && store.state.adminMode;
    const profile = store.state.profile;

    container.innerHTML = `
        <div class="h-[100dvh] md:h-[calc(100vh-64px)] w-full flex overflow-hidden bg-slate-100 md:bg-gradient-to-br md:from-slate-50 md:to-slate-100 md:rounded-3xl md:shadow-xl md:border md:border-slate-200/80 fixed md:relative inset-0 md:inset-auto z-40 md:z-auto">
            
            <!-- LISTE (GAUCHE) -->
            <div id="chat-list-panel" class="w-full md:w-96 flex-shrink-0 flex flex-col border-r border-slate-200/50 bg-white ${params.id ? 'hidden md:flex' : 'flex'}">
                
                <!-- Header Liste -->
                <div class="p-4 pt-safe border-b border-slate-100 bg-white flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 class="font-black text-xl text-slate-900 tracking-tight">Messages</h2>
                        <p class="text-xs text-slate-400 font-medium">Vos conversations</p>
                    </div>
                    <button id="btn-new-ticket" class="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center hover:from-brand-600 hover:to-brand-700 transition-all shadow-lg shadow-brand-500/30 active:scale-95">
                        <i data-lucide="plus" class="w-6 h-6"></i>
                    </button>
                </div>

                <!-- Liste Items -->
                <div id="tickets-container" class="flex-1 overflow-y-auto p-3 pb-safe space-y-2 scroll-smooth overscroll-contain">
                    ${renderSkeletonList()}
                </div>
            </div>

            <!-- CONVERSATION (DROITE) -->
            <div id="chat-conversation-panel" class="flex-1 flex flex-col bg-white overflow-hidden relative ${params.id ? 'flex' : 'hidden md:flex'}">
                
                <!-- Header Conv -->
                <div id="chat-header" class="min-h-[70px] border-b border-slate-100 flex items-center px-4 pt-safe justify-between bg-white z-10 flex-shrink-0 shadow-sm">
                    <div class="flex items-center gap-3">
                        <button id="btn-back-list" class="md:hidden w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition active:scale-95">
                            <i data-lucide="arrow-left" class="w-6 h-6"></i>
                        </button>
                        <div id="active-ticket-info" class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <i data-lucide="message-circle" class="w-5 h-5 text-slate-400"></i>
                            </div>
                            <div>
                                <p class="text-sm text-slate-400 italic font-medium">Sélectionnez une conversation</p>
                            </div>
                        </div>
                    </div>
                    <div id="ticket-actions" class="hidden">
                        <!-- Actions will be injected here -->
                    </div>
                </div>

                <!-- Messages Zone -->
                <div id="messages-container" class="flex-1 overflow-y-auto px-3 py-4 space-y-1 scroll-smooth overscroll-contain bg-slate-50">
                    <div class="h-full flex flex-col items-center justify-center text-slate-300">
                        <div class="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
                            <i data-lucide="message-square" class="w-10 h-10 opacity-50"></i>
                        </div>
                        <span class="text-sm font-semibold">Vos échanges apparaîtront ici</span>
                        <span class="text-xs text-slate-300 mt-1">Sélectionnez une conversation pour commencer</span>
                    </div>
                </div>

                <!-- Input Zone (fixed at bottom on mobile) -->
                <form id="chat-input-form" class="p-3 pb-safe bg-white border-t border-slate-100 hidden">
                    <div class="flex items-end gap-2">
                        <div class="flex-1 relative">
                            <div class="flex items-center gap-1 bg-slate-100 p-2 pl-4 rounded-full border border-slate-200 focus-within:border-brand-400 focus-within:bg-white transition-all">
                                <input id="message-input" type="text" autocomplete="off" placeholder="Message..." class="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-700 placeholder-slate-400 min-w-0 py-1">
                                <button type="button" id="btn-emoji" class="w-9 h-9 text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-full transition-all flex-shrink-0 flex items-center justify-center">
                                    <i data-lucide="smile" class="w-5 h-5"></i>
                                </button>
                            </div>
                            <!-- Emoji Picker -->
                            <div id="emoji-picker" class="absolute bottom-full left-0 right-0 mb-2 p-3 bg-white rounded-2xl shadow-2xl border border-slate-100 hidden animate-fade-in z-50">
                                <div class="grid grid-cols-8 gap-1">
                                    ${EMOJI_LIST.map(e => `<button type="button" class="emoji-btn w-9 h-9 text-xl hover:bg-slate-100 rounded-lg transition flex items-center justify-center active:scale-90">${e}</button>`).join('')}
                                </div>
                            </div>
                        </div>
                        <button type="submit" id="btn-send" class="w-11 h-11 bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-full hover:from-brand-600 hover:to-brand-700 transition-all shadow-lg shadow-brand-500/30 active:scale-90 flex-shrink-0 flex items-center justify-center">
                            <i data-lucide="send" class="w-5 h-5"></i>
                        </button>
                    </div>
                </form>

            </div>
        </div>
    `;

    // --- MODALE NOUVEAU TICKET ---
    const modalHtml = `
        <div id="create-ticket-modal" class="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-md hidden" style="animation: fadeIn 0.2s ease-out;">
            <div class="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl" style="animation: slideUp 0.3s ease-out;">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                        <i data-lucide="message-square-plus" class="w-7 h-7 text-white"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-xl text-slate-900">Nouvelle Conversation</h3>
                        <p class="text-sm text-slate-400">Démarrer un échange</p>
                    </div>
                </div>
                
                <form id="form-create-ticket" class="space-y-5">
                    
                    ${isAdmin ? `
                    <div class="bg-slate-50 p-1.5 rounded-2xl flex gap-1">
                        <button type="button" data-type="support" class="btn-type-select flex-1 py-3 text-sm font-bold rounded-xl bg-white text-slate-800 shadow-sm transition-all">
                            <i data-lucide="headphones" class="w-4 h-4 inline mr-2"></i>Support
                        </button>
                        <button type="button" data-type="announcement" class="btn-type-select flex-1 py-3 text-sm font-bold rounded-xl text-slate-500 hover:text-slate-800 transition-all">
                            <i data-lucide="megaphone" class="w-4 h-4 inline mr-2"></i>Annonce
                        </button>
                        <input type="hidden" name="type" id="input-ticket-type" value="support">
                    </div>
                    ` : `<input type="hidden" name="type" value="support">`}

                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Sujet</label>
                        <input name="subject" placeholder="Ex: Question sur le planning" class="w-full p-4 bg-slate-50 rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 focus:bg-white transition-all text-slate-700" required>
                    </div>

                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Message</label>
                        <textarea name="content" rows="4" placeholder="Votre message..." class="w-full p-4 bg-slate-50 rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 focus:bg-white transition-all resize-none text-slate-700" required></textarea>
                    </div>

                    <button type="submit" class="w-full py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 transition-all hover:from-brand-600 hover:to-brand-700 active:scale-[0.98]">
                        <i data-lucide="send" class="w-4 h-4 inline mr-2"></i>Envoyer
                    </button>
                </form>
                
                <button id="btn-close-ticket-modal" class="w-full py-3 mt-3 text-slate-400 font-semibold text-sm hover:bg-slate-50 rounded-2xl transition-all">Annuler</button>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', modalHtml);

    setupEventListeners(container, isAdmin);
    createIcons({ icons });

    await loadTicketsList();

    if (params.id) {
        await openTicket(params.id);
    }
}

// --- LOGIC ---

async function loadTicketsList() {
    const container = document.getElementById('tickets-container');
    if (!container) return;

    container.innerHTML = renderSkeletonList();

    const { data: tickets, error } = await ChatService.getTickets();
    if (error) {
        container.innerHTML = `<div class="text-center py-10 text-red-400 font-semibold">Erreur de chargement.</div>`;
        return;
    }

    if (tickets.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16">
                <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="inbox" class="w-8 h-8 text-slate-300"></i>
                </div>
                <p class="text-slate-400 font-semibold">Aucune conversation</p>
                <p class="text-xs text-slate-300 mt-1">Créez-en une nouvelle !</p>
            </div>
        `;
        createIcons({ icons, root: container });
    } else {
        container.innerHTML = tickets.map(t => renderTicketItem(t)).join('');
        createIcons({ icons, root: container });
    }
}

function renderTicketItem(t) {
    const lastMsg = t.last_message || 'Nouvelle conversation';
    const date = formatDate(t.updated_at);
    const isAnnouncement = t.category === 'announcement';
    const initial = t.subject ? t.subject[0].toUpperCase() : '?';
    const isClosed = t.status === 'closed';

    const avatarBg = isAnnouncement
        ? 'bg-gradient-to-br from-amber-400 to-orange-500'
        : 'bg-gradient-to-br from-brand-400 to-brand-600';

    const icon = isAnnouncement ? 'megaphone' : 'message-circle';

    return `
        <div data-action="open-ticket" data-ticket-id="${t.id}" class="ticket-item group p-4 rounded-2xl cursor-pointer hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-200 border-2 border-transparent hover:border-slate-100 ${isClosed ? 'opacity-60' : ''}">
            <div class="flex items-start gap-3">
                <div class="w-12 h-12 rounded-2xl ${avatarBg} flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                    <i data-lucide="${icon}" class="w-5 h-5"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2 mb-1">
                        <span class="font-bold text-slate-900 text-sm truncate flex items-center gap-2">
                            ${escapeHtml(t.subject)}
                            ${isClosed ? '<span class="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">Résolu</span>' : ''}
                        </span>
                        <span class="text-[10px] text-slate-400 font-medium flex-shrink-0">${date}</span>
                    </div>
                    <div class="text-xs text-slate-500 truncate font-medium">${escapeHtml(lastMsg)}</div>
                </div>
            </div>
        </div>
    `;
}

function renderSkeletonList() {
    return Array(4).fill(0).map(() => `
        <div class="p-4 rounded-2xl bg-white animate-pulse">
            <div class="flex items-start gap-3">
                <div class="w-12 h-12 rounded-2xl bg-slate-100"></div>
                <div class="flex-1">
                    <div class="h-4 bg-slate-100 rounded-lg w-2/3 mb-2"></div>
                    <div class="h-3 bg-slate-50 rounded-lg w-full"></div>
                </div>
            </div>
        </div>
    `).join('');
}

async function openTicket(id) {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
        realtimeSubscription = null;
    }

    currentTicketId = id;
    const msgContainer = document.getElementById('messages-container');
    const inputForm = document.getElementById('chat-input-form');
    const headerInfo = document.getElementById('active-ticket-info');
    const ticketActions = document.getElementById('ticket-actions');

    // UI Update List
    document.querySelectorAll('.ticket-item').forEach(el => {
        el.classList.remove('bg-brand-50', 'border-brand-200', 'shadow-lg');
        if (el.dataset.ticketId === id) {
            el.classList.add('bg-brand-50', 'border-brand-200', 'shadow-lg');
        }
    });

    // Mobile View
    if (window.innerWidth < 768) {
        document.getElementById('chat-list-panel')?.classList.add('hidden');
        document.getElementById('chat-conversation-panel')?.classList.remove('hidden');
    }

    if (inputForm) inputForm.classList.remove('hidden');

    // Loading
    msgContainer.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="flex flex-col items-center">
                <div class="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-3"></div>
                <span class="text-xs text-slate-400 font-medium">Chargement...</span>
            </div>
        </div>
    `;

    // Fetch ticket details and messages
    const { data: messages, error } = await ChatService.getMessages(id);
    const { data: tickets } = await ChatService.getTickets();
    const ticket = tickets?.find(t => t.id === id);

    if (error) {
        msgContainer.innerHTML = `<div class="text-center mt-10 text-red-400 font-semibold">Erreur chargement messages.</div>`;
        return;
    }

    // Update header
    if (ticket && headerInfo) {
        const isAnnouncement = ticket.category === 'announcement';
        const avatarBg = isAnnouncement ? 'from-amber-400 to-orange-500' : 'from-brand-400 to-brand-600';
        const isClosed = ticket.status === 'closed';
        const statusBadge = isClosed
            ? '<span class="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-semibold ml-2">Résolu</span>'
            : '<span class="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold ml-2">En cours</span>';

        headerInfo.innerHTML = `
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarBg} flex items-center justify-center text-white shadow-md">
                <i data-lucide="${isAnnouncement ? 'megaphone' : 'message-circle'}" class="w-5 h-5"></i>
            </div>
            <div>
                <p class="font-bold text-slate-900 flex items-center">${escapeHtml(ticket.subject)}${statusBadge}</p>
                <p class="text-xs text-slate-400">${isAnnouncement ? 'Annonce' : 'Support'} • ${formatDate(ticket.created_at)}</p>
            </div>
        `;

        // Actions (Admin only)
        const isAdmin = store.state.profile?.is_admin && store.state.adminMode;
        if (isAdmin && ticketActions) {
            ticketActions.innerHTML = `
                <div class="flex items-center gap-2">
                    ${!isClosed ? `
                        <button id="btn-close-ticket" class="p-2.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all" title="Marquer résolu">
                            <i data-lucide="check-circle" class="w-5 h-5"></i>
                        </button>
                    ` : ''}
                    <button id="btn-delete-ticket" class="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Supprimer">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                </div>
            `;
            ticketActions.classList.remove('hidden');
            createIcons({ icons, root: ticketActions });

            // Attach actions
            const closeBtn = ticketActions.querySelector('#btn-close-ticket');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => handleCloseTicket(id));
            }
            const deleteBtn = ticketActions.querySelector('#btn-delete-ticket');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => handleDeleteTicket(id));
            }
        }

        createIcons({ icons, root: headerInfo });
    }

    renderMessages(msgContainer, messages);

    // Realtime
    realtimeSubscription = ChatService.subscribeToTicket(id, (newMessage) => {
        handleNewRealtimeMessage(newMessage);
    });
}

function renderMessages(container, messages) {
    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16">
                <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="message-circle" class="w-8 h-8 text-slate-300"></i>
                </div>
                <p class="text-slate-400 font-semibold">Début de la conversation</p>
                <p class="text-xs text-slate-300 mt-1">Envoyez le premier message</p>
            </div>
        `;
        createIcons({ icons, root: container });
        return;
    }

    const currentUserId = store.state.user?.id || store.state.session?.user?.id;

    container.innerHTML = messages.map((m, idx) => {
        const isMe = currentUserId && m.user_id === currentUserId;
        const isAdmin = m.profiles?.is_admin;
        const firstName = m.profiles?.first_name || 'Inconnu';
        const initial = firstName[0].toUpperCase();
        const time = formatDate(m.created_at);

        // Group messages from same user
        const prevMsg = messages[idx - 1];
        const isSameUser = prevMsg && prevMsg.user_id === m.user_id;
        const showAvatar = !isSameUser;

        if (isMe) {
            return `
                <div class="flex w-full ${showAvatar ? 'mt-4' : 'mt-1'} justify-end animate-fade-in">
                    <div class="max-w-[75%] md:max-w-[60%]">
                        ${showAvatar ? `<div class="text-[10px] text-slate-400 font-medium mb-1 text-right mr-2">Vous • ${time}</div>` : ''}
                        <div class="p-4 rounded-3xl rounded-tr-lg bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/20">
                            <p class="text-sm leading-relaxed break-words font-medium">${escapeHtml(m.content)}</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            const avatarBg = isAdmin ? 'from-red-500 to-rose-600' : 'from-slate-400 to-slate-500';
            return `
                <div class="flex w-full ${showAvatar ? 'mt-4' : 'mt-1'} justify-start animate-fade-in">
                    <div class="flex items-end gap-2 max-w-[75%] md:max-w-[60%]">
                        ${showAvatar ? `
                            <div class="w-8 h-8 rounded-full bg-gradient-to-br ${avatarBg} flex items-center justify-center text-white font-bold text-xs shadow-md flex-shrink-0">
                                ${initial}
                            </div>
                        ` : '<div class="w-8"></div>'}
                        <div>
                            ${showAvatar ? `<div class="text-[10px] text-slate-400 font-medium mb-1 ml-2">${escapeHtml(firstName)}${isAdmin ? ' <span class="text-red-400">• Admin</span>' : ''} • ${time}</div>` : ''}
                            <div class="p-4 rounded-3xl rounded-tl-lg bg-white border border-slate-100 text-slate-700 shadow-sm">
                                <p class="text-sm leading-relaxed break-words font-medium">${escapeHtml(m.content)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');

    container.scrollTop = container.scrollHeight;
}

function handleNewRealtimeMessage(newMessage) {
    const container = document.getElementById('messages-container');
    if (!container) return;

    const currentUserId = store.state.user?.id || store.state.session?.user?.id;
    if (currentUserId && newMessage.user_id === currentUserId) {
        return; // Optimistic UI already showed it
    }

    const time = formatDate(newMessage.created_at);
    const messageHtml = `
        <div class="flex w-full mt-4 justify-start animate-fade-in">
            <div class="flex items-end gap-2 max-w-[75%] md:max-w-[60%]">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white font-bold text-xs shadow-md flex-shrink-0">
                    ?
                </div>
                <div>
                    <div class="text-[10px] text-slate-400 font-medium mb-1 ml-2">Nouveau message • ${time}</div>
                    <div class="p-4 rounded-3xl rounded-tl-lg bg-white border border-slate-100 text-slate-700 shadow-sm">
                        <p class="text-sm leading-relaxed break-words font-medium">${escapeHtml(newMessage.content)}</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', messageHtml);
    container.scrollTop = container.scrollHeight;
}

async function handleCloseTicket(ticketId) {
    showConfirm("Marquer cette conversation comme résolue ?", async () => {
        toggleLoader(true);
        const res = await ChatService.closeTicket(ticketId);
        toggleLoader(false);
        if (res.success) {
            showToast("Conversation marquée comme résolue ✓");
            await loadTicketsList();
            await openTicket(ticketId);
        } else {
            showToast("Erreur lors de la fermeture", "error");
        }
    });
}

async function handleDeleteTicket(ticketId) {
    showConfirm("Supprimer définitivement cette conversation et tous ses messages ?", async () => {
        toggleLoader(true);
        const res = await ChatService.deleteTicket(ticketId);
        toggleLoader(false);
        if (res.success) {
            showToast("Conversation supprimée");
            currentTicketId = null;
            await loadTicketsList();
            // Reset conversation panel
            const msgContainer = document.getElementById('messages-container');
            const inputForm = document.getElementById('chat-input-form');
            const headerInfo = document.getElementById('active-ticket-info');
            const ticketActions = document.getElementById('ticket-actions');

            if (msgContainer) {
                msgContainer.innerHTML = `
                    <div class="h-full flex flex-col items-center justify-center text-slate-300">
                        <div class="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <i data-lucide="message-square" class="w-10 h-10 opacity-50"></i>
                        </div>
                        <span class="text-sm font-semibold">Vos échanges apparaîtront ici</span>
                    </div>
                `;
                createIcons({ icons, root: msgContainer });
            }
            if (inputForm) inputForm.classList.add('hidden');
            if (headerInfo) headerInfo.innerHTML = `<p class="text-sm text-slate-400 italic font-medium">Sélectionnez une conversation</p>`;
            if (ticketActions) ticketActions.classList.add('hidden');
        } else {
            showToast("Erreur lors de la suppression", "error");
        }
    }, { type: 'danger', confirmText: 'Supprimer' });
}

// --- EVENTS ---

function setupEventListeners(root, isAdmin) {
    // Back button
    const backBtn = root.querySelector('#btn-back-list');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (realtimeSubscription) {
                realtimeSubscription.unsubscribe();
                realtimeSubscription = null;
            }
            document.getElementById('chat-conversation-panel').classList.add('hidden');
            document.getElementById('chat-list-panel').classList.remove('hidden');
            currentTicketId = null;
        });
    }

    // New ticket modal
    const btnNewTicket = root.querySelector('#btn-new-ticket');
    if (btnNewTicket) {
        btnNewTicket.addEventListener('click', () => {
            document.getElementById('create-ticket-modal')?.classList.remove('hidden');
        });
    }

    // Ticket list delegation
    const ticketsContainer = root.querySelector('#tickets-container');
    if (ticketsContainer) {
        ticketsContainer.addEventListener('click', (e) => {
            const ticketItem = e.target.closest('.ticket-item');
            if (ticketItem && ticketItem.dataset.ticketId) {
                openTicket(ticketItem.dataset.ticketId);
            }
        });
    }

    // Message form
    const form = root.querySelector('#chat-input-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('message-input');
            const content = input.value.trim();
            if (!content || !currentTicketId) return;

            input.value = '';

            // Optimistic UI
            const container = document.getElementById('messages-container');
            const profile = store.state.profile;
            const tempId = `temp-${Date.now()}`;

            const optimisticHtml = `
                <div id="${tempId}" class="flex w-full mt-4 justify-end animate-fade-in">
                    <div class="max-w-[75%] md:max-w-[60%]">
                        <div class="text-[10px] text-slate-400 font-medium mb-1 text-right mr-2">Vous • À l'instant</div>
                        <div class="p-4 rounded-3xl rounded-tr-lg bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/20">
                            <p class="text-sm leading-relaxed break-words font-medium">${escapeHtml(content)}</p>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', optimisticHtml);
            container.scrollTop = container.scrollHeight;

            const res = await ChatService.sendMessage(currentTicketId, content);

            if (!res.success) {
                document.getElementById(tempId)?.remove();
                input.value = content;
                showToast("Échec envoi message", "error");
            }
        });
    }

    // Emoji picker
    const btnEmoji = root.querySelector('#btn-emoji');
    const emojiPicker = root.querySelector('#emoji-picker');
    if (btnEmoji && emojiPicker) {
        btnEmoji.addEventListener('click', (e) => {
            e.stopPropagation();
            emojiPicker.classList.toggle('hidden');
        });

        emojiPicker.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const emoji = btn.textContent;
                const input = document.getElementById('message-input');
                if (input) {
                    input.value += emoji;
                    input.focus();
                }
                emojiPicker.classList.add('hidden');
            });
        });

        // Close picker on outside click
        document.addEventListener('click', () => {
            emojiPicker.classList.add('hidden');
        });
    }

    // Modal close
    const closeBtn = document.getElementById('btn-close-ticket-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('create-ticket-modal').classList.add('hidden');
        });
    }

    // Type toggle (Admin)
    const typeBtns = root.querySelectorAll('.btn-type-select');
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            document.getElementById('input-ticket-type').value = type;

            typeBtns.forEach(b => {
                if (b.dataset.type === type) {
                    b.className = "btn-type-select flex-1 py-3 text-sm font-bold rounded-xl bg-white text-slate-800 shadow-sm transition-all";
                } else {
                    b.className = "btn-type-select flex-1 py-3 text-sm font-bold rounded-xl text-slate-500 hover:text-slate-800 transition-all";
                }
            });
        });
    });

    // Create ticket form
    const createForm = document.getElementById('form-create-ticket');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const type = fd.get('type');
            const subj = fd.get('subject');
            const content = fd.get('content');

            toggleLoader(true);
            let res;
            if (type === 'announcement') {
                res = await ChatService.createAnnouncement(subj, content);
            } else {
                res = await ChatService.createTicket(subj, content);
            }
            toggleLoader(false);

            if (res.success) {
                showToast("Conversation créée !");
                document.getElementById('create-ticket-modal').classList.add('hidden');
                createForm.reset();
                await loadTicketsList();
                openTicket(res.data.id);
            } else {
                showToast(res.error?.message || "Erreur création", "error");
            }
        });
    }
}
