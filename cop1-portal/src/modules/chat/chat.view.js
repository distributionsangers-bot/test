import { ChatService } from './chat.service.js';
import { store } from '../../core/store.js';
import { showToast, toggleLoader, escapeHtml, formatDate, showConfirm } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';

let currentTicketId = null;
let realtimeSubscription = null;

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '✅', '👏', '🎉', '💪', '👋'];

export async function initChat() {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
        realtimeSubscription = null;
    }
    currentTicketId = null;
}

export async function renderChat(container, params = {}) {
    const isAdmin = store.state.profile?.is_admin && store.state.adminMode;

    container.innerHTML = `
        <div class="h-[100dvh] md:h-[calc(100vh-64px)] w-full flex overflow-hidden bg-white md:bg-slate-100 md:rounded-2xl md:shadow-lg md:border md:border-slate-200 fixed md:relative inset-0 md:inset-auto z-40 md:z-auto">
            
            <!-- LIST PANEL -->
            <div id="chat-list-panel" class="w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col bg-white md:border-r md:border-slate-200 ${params.id ? 'hidden md:flex' : 'flex'}">
                
                <!-- Header -->
                <div class="px-4 py-3 pt-safe border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h1 class="font-bold text-lg text-slate-900">Messages</h1>
                    <button id="btn-new-ticket" class="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition active:scale-95 shadow-md">
                        <i data-lucide="plus" class="w-5 h-5"></i>
                    </button>
                </div>

                <!-- Tickets List -->
                <div id="tickets-container" class="flex-1 overflow-y-auto overscroll-contain">
                    ${renderSkeletonList()}
                </div>
            </div>

            <!-- CONVERSATION PANEL -->
            <div id="chat-conversation-panel" class="flex-1 flex flex-col bg-slate-50 overflow-hidden ${params.id ? 'flex' : 'hidden md:flex'}">
                
                <!-- Header -->
                <div id="chat-header" class="h-14 px-3 pt-safe border-b border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
                    <div class="flex items-center gap-2 min-w-0">
                        <button id="btn-back-list" class="md:hidden w-9 h-9 flex items-center justify-center text-brand-500 rounded-full hover:bg-slate-100 transition active:scale-95 -ml-1">
                            <i data-lucide="chevron-left" class="w-6 h-6"></i>
                        </button>
                        <div id="active-ticket-info" class="flex items-center gap-2 min-w-0">
                            <span class="text-sm text-slate-400">Sélectionnez une conversation</span>
                        </div>
                    </div>
                    <div id="ticket-actions" class="hidden flex-shrink-0"></div>
                </div>

                <!-- Messages -->
                <div id="messages-container" class="flex-1 overflow-y-auto px-3 py-3 overscroll-contain scroll-smooth" style="background: linear-gradient(to bottom, #f8fafc, #ffffff);">
                    <div class="h-full flex flex-col items-center justify-center text-slate-300">
                        <i data-lucide="message-circle" class="w-12 h-12 mb-3 opacity-50"></i>
                        <span class="text-sm font-medium">Vos messages apparaîtront ici</span>
                    </div>
                </div>

                <!-- Input -->
                <form id="chat-input-form" class="px-3 py-2 pb-safe bg-white border-t border-slate-100 hidden">
                    <div class="flex items-end gap-2">
                        <div class="flex-1 relative">
                            <div class="flex items-center bg-slate-100 rounded-3xl px-4 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-400 transition-all">
                                <input id="message-input" type="text" autocomplete="off" placeholder="Message" 
                                    class="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none min-w-0">
                                <button type="button" id="btn-emoji" class="w-7 h-7 text-slate-400 hover:text-amber-500 rounded-full flex items-center justify-center transition ml-1">
                                    <i data-lucide="smile" class="w-5 h-5"></i>
                                </button>
                            </div>
                            <div id="emoji-picker" class="absolute bottom-full left-0 right-0 mb-2 p-2 bg-white rounded-2xl shadow-xl border border-slate-100 hidden z-50">
                                <div class="grid grid-cols-6 gap-0.5">
                                    ${EMOJI_LIST.map(e => `<button type="button" class="emoji-btn w-10 h-10 text-xl hover:bg-slate-100 rounded-xl transition flex items-center justify-center active:scale-90">${e}</button>`).join('')}
                                </div>
                            </div>
                        </div>
                        <button type="submit" id="btn-send" class="w-9 h-9 bg-brand-500 text-white rounded-full flex items-center justify-center hover:bg-brand-600 transition active:scale-90 shadow-md flex-shrink-0">
                            <i data-lucide="arrow-up" class="w-5 h-5"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // New ticket modal
    appendNewTicketModal(isAdmin);

    createIcons({ icons, root: container });
    await setupEventListeners(container);
    await loadTicketsList();

    if (params.id) {
        await openTicket(params.id);
    }
}

async function appendNewTicketModal(isAdmin) {
    // Fetch volunteers list for admin
    let volunteersHtml = '';
    if (isAdmin) {
        const { data: volunteers } = await import('../../services/supabase.js').then(m =>
            m.supabase.from('profiles').select('id, first_name, last_name, email').eq('status', 'approved').order('first_name')
        );
        if (volunteers && volunteers.length > 0) {
            volunteersHtml = `
                <div id="volunteer-selector-wrapper" class="hidden">
                    <label class="text-xs font-semibold text-slate-500 mb-1 block">Envoyer à</label>
                    <div class="relative">
                        <i data-lucide="search" class="absolute left-3 top-3 w-4 h-4 text-slate-400"></i>
                        <input type="text" id="volunteer-search" placeholder="Rechercher un bénévole..." 
                            class="w-full pl-9 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none focus:border-brand-400 focus:bg-white transition">
                    </div>
                    <div id="volunteers-dropdown" class="mt-2 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl hidden">
                        ${volunteers.map(v => `
                            <button type="button" class="volunteer-option w-full text-left px-3 py-2 hover:bg-brand-50 transition flex items-center gap-2" data-id="${v.id}" data-name="${v.first_name || ''} ${v.last_name || ''}">
                                <div class="w-7 h-7 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    ${(v.first_name || '?')[0].toUpperCase()}
                                </div>
                                <div class="min-w-0">
                                    <div class="text-sm font-medium text-slate-700 truncate">${v.first_name || ''} ${v.last_name || ''}</div>
                                    <div class="text-[10px] text-slate-400 truncate">${v.email}</div>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                    <input type="hidden" name="target_user_id" id="input-target-user">
                    <div id="selected-volunteer" class="hidden mt-2 p-2 bg-brand-50 rounded-xl flex items-center justify-between">
                        <span class="text-sm font-medium text-brand-700" id="selected-volunteer-name"></span>
                        <button type="button" id="btn-clear-volunteer" class="text-brand-500 hover:text-brand-700">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;
        }
    }

    const modal = document.createElement('div');
    modal.id = 'create-ticket-modal';
    modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center backdrop-blur-sm hidden';
    modal.innerHTML = `
        <div class="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-3xl p-5 pb-safe shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-lg text-slate-900">Nouvelle conversation</h3>
                <button id="btn-close-modal" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            
            <form id="form-create-ticket" class="space-y-4">
                ${isAdmin ? `
                <div class="flex gap-1 p-1 bg-slate-100 rounded-xl">
                    <button type="button" data-type="support" class="btn-type-select flex-1 py-2 text-xs font-semibold rounded-lg bg-white text-slate-800 shadow-sm transition">💬 Support</button>
                    <button type="button" data-type="direct" class="btn-type-select flex-1 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-700 transition">👤 Direct</button>
                    <button type="button" data-type="announcement" class="btn-type-select flex-1 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-700 transition">📢 Annonce</button>
                    <input type="hidden" name="type" id="input-ticket-type" value="support">
                </div>
                ${volunteersHtml}
                ` : '<input type="hidden" name="type" value="support">'}

                <input name="subject" placeholder="Sujet" required 
                    class="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium border border-slate-200 outline-none focus:border-brand-400 focus:bg-white transition">
                
                <textarea name="content" rows="3" placeholder="Votre message..." required 
                    class="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium border border-slate-200 outline-none focus:border-brand-400 focus:bg-white transition resize-none"></textarea>

                <button type="submit" class="w-full py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition active:scale-[0.98]">
                    Envoyer
                </button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    createIcons({ icons, root: modal });

    // Setup volunteer search for admin
    if (isAdmin) {
        setupVolunteerSearch(modal);
    }
}

function renderSkeletonList() {
    return Array(5).fill(0).map(() => `
        <div class="flex items-center gap-3 p-3 animate-pulse">
            <div class="w-10 h-10 bg-slate-100 rounded-full flex-shrink-0"></div>
            <div class="flex-1 space-y-2">
                <div class="h-3 bg-slate-100 rounded w-2/3"></div>
                <div class="h-2.5 bg-slate-50 rounded w-full"></div>
            </div>
        </div>
    `).join('');
}

async function loadTicketsList() {
    const container = document.getElementById('tickets-container');
    if (!container) return;

    const { data: tickets, error } = await ChatService.getTickets();

    if (error) {
        container.innerHTML = `<div class="p-6 text-center text-red-400 text-sm">Erreur de chargement</div>`;
        return;
    }

    if (!tickets || tickets.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center">
                <div class="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i data-lucide="inbox" class="w-6 h-6 text-slate-300"></i>
                </div>
                <p class="text-slate-400 text-sm font-medium">Aucune conversation</p>
            </div>
        `;
        createIcons({ icons, root: container });
        return;
    }

    container.innerHTML = tickets.map(t => renderTicketItem(t)).join('');
    createIcons({ icons, root: container });
}

function renderTicketItem(t) {
    const isAnnouncement = t.category === 'announcement';
    const isActive = currentTicketId === t.id;
    const isClosed = t.status === 'closed';

    // Last message preview
    const lastMsg = t.messages?.[0];
    const preview = lastMsg ? escapeHtml(lastMsg.content).slice(0, 40) + (lastMsg.content?.length > 40 ? '...' : '') : 'Aucun message';

    // Time
    const timeAgo = formatTimeAgo(t.updated_at || t.created_at);

    // Avatar color
    const avatarBg = isAnnouncement ? 'bg-amber-100 text-amber-600' : isClosed ? 'bg-slate-100 text-slate-400' : 'bg-brand-100 text-brand-600';

    return `
        <button class="ticket-item w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition ${isActive ? 'bg-brand-50' : ''}" data-ticket-id="${t.id}">
            <div class="w-10 h-10 ${avatarBg} rounded-full flex items-center justify-center flex-shrink-0">
                <i data-lucide="${isAnnouncement ? 'megaphone' : 'message-circle'}" class="w-4 h-4"></i>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                    <span class="font-semibold text-sm text-slate-800 truncate">${escapeHtml(t.subject)}</span>
                    <span class="text-[10px] text-slate-400 flex-shrink-0">${timeAgo}</span>
                </div>
                <div class="flex items-center justify-between gap-2 mt-0.5">
                    <span class="text-xs text-slate-400 truncate">${preview}</span>
                    ${isClosed ? '<span class="text-[9px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-medium flex-shrink-0">Résolu</span>' : ''}
                </div>
            </div>
        </button>
    `;
}

async function setupEventListeners(container) {
    // New ticket button
    document.getElementById('btn-new-ticket')?.addEventListener('click', () => {
        document.getElementById('create-ticket-modal')?.classList.remove('hidden');
    });

    // Close modal
    document.getElementById('btn-close-modal')?.addEventListener('click', () => {
        document.getElementById('create-ticket-modal')?.classList.add('hidden');
    });

    document.getElementById('create-ticket-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'create-ticket-modal') {
            e.target.classList.add('hidden');
        }
    });

    // Type selector (admin)
    document.querySelectorAll('.btn-type-select').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-type-select').forEach(b => {
                b.className = 'btn-type-select flex-1 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-700 transition';
            });
            btn.className = 'btn-type-select flex-1 py-2 text-xs font-semibold rounded-lg bg-white text-slate-800 shadow-sm transition';
            const type = btn.dataset.type;
            document.getElementById('input-ticket-type').value = type;

            // Show/hide volunteer selector for direct messages
            const volunteerWrapper = document.getElementById('volunteer-selector-wrapper');
            if (volunteerWrapper) {
                if (type === 'direct') {
                    volunteerWrapper.classList.remove('hidden');
                } else {
                    volunteerWrapper.classList.add('hidden');
                }
            }
        });
    });

    // Create ticket form
    document.getElementById('form-create-ticket')?.addEventListener('submit', handleCreateTicket);

    // Back button
    document.getElementById('btn-back-list')?.addEventListener('click', () => {
        document.getElementById('chat-list-panel')?.classList.remove('hidden');
        document.getElementById('chat-conversation-panel')?.classList.add('hidden', 'md:flex');
        currentTicketId = null;
    });

    // Ticket click
    document.getElementById('tickets-container')?.addEventListener('click', async (e) => {
        const item = e.target.closest('.ticket-item');
        if (item) {
            await openTicket(item.dataset.ticketId);
        }
    });

    // Send message
    document.getElementById('chat-input-form')?.addEventListener('submit', handleSendMessage);

    // Emoji picker
    document.getElementById('btn-emoji')?.addEventListener('click', () => {
        document.getElementById('emoji-picker')?.classList.toggle('hidden');
    });

    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById('message-input');
            if (input) input.value += btn.textContent;
            document.getElementById('emoji-picker')?.classList.add('hidden');
            input?.focus();
        });
    });

    // Close emoji on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#btn-emoji') && !e.target.closest('#emoji-picker')) {
            document.getElementById('emoji-picker')?.classList.add('hidden');
        }
    });
}

async function handleCreateTicket(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const type = fd.get('type');
    const targetUserId = fd.get('target_user_id');

    // Validation for direct messages
    if (type === 'direct' && !targetUserId) {
        showToast("Sélectionnez un bénévole", "error");
        return;
    }

    toggleLoader(true);
    let res;

    if (type === 'announcement') {
        res = await ChatService.createAnnouncement(fd.get('subject'), fd.get('content'));
    } else if (type === 'direct') {
        res = await ChatService.createDirectMessage(targetUserId, fd.get('subject'), fd.get('content'));
    } else {
        res = await ChatService.createTicket(fd.get('subject'), fd.get('content'));
    }

    toggleLoader(false);

    if (res.error) {
        showToast(res.error.message || "Erreur création", "error");
        return;
    }

    document.getElementById('create-ticket-modal')?.classList.add('hidden');
    form.reset();
    // Reset volunteer selection
    document.getElementById('selected-volunteer')?.classList.add('hidden');
    document.getElementById('volunteers-dropdown')?.classList.add('hidden');
    const targetInput = document.getElementById('input-target-user');
    if (targetInput) targetInput.value = '';

    showToast("Conversation créée ✓");
    await loadTicketsList();
    if (res.data?.id) {
        await openTicket(res.data.id);
    }
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

    // Show dropdown on focus
    searchInput.addEventListener('focus', () => {
        dropdown.classList.remove('hidden');
    });

    // Filter options on input
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        options.forEach(opt => {
            const name = opt.dataset.name.toLowerCase();
            opt.classList.toggle('hidden', !name.includes(query));
        });
        dropdown.classList.remove('hidden');
    });

    // Select volunteer
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            hiddenInput.value = opt.dataset.id;
            selectedName.textContent = opt.dataset.name;
            selectedDiv.classList.remove('hidden');
            dropdown.classList.add('hidden');
            searchInput.value = '';
        });
    });

    // Clear selection
    clearBtn?.addEventListener('click', () => {
        hiddenInput.value = '';
        selectedDiv.classList.add('hidden');
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#volunteer-selector-wrapper')) {
            dropdown.classList.add('hidden');
        }
    });
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

    // Update list selection
    document.querySelectorAll('.ticket-item').forEach(el => {
        el.classList.toggle('bg-brand-50', el.dataset.ticketId === id);
    });

    // Mobile view
    if (window.innerWidth < 768) {
        document.getElementById('chat-list-panel')?.classList.add('hidden');
        document.getElementById('chat-conversation-panel')?.classList.remove('hidden');
    }

    inputForm?.classList.remove('hidden');

    // Loading
    msgContainer.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
        </div>
    `;

    const { data: messages, error } = await ChatService.getMessages(id);
    const { data: tickets } = await ChatService.getTickets();
    const ticket = tickets?.find(t => t.id === id);

    if (error) {
        msgContainer.innerHTML = `<div class="text-center py-8 text-red-400 text-sm">Erreur chargement</div>`;
        return;
    }

    // Update header
    if (ticket && headerInfo) {
        const isAnnouncement = ticket.category === 'announcement';
        const isClosed = ticket.status === 'closed';

        headerInfo.innerHTML = `
            <div class="w-8 h-8 ${isAnnouncement ? 'bg-amber-100 text-amber-600' : 'bg-brand-100 text-brand-600'} rounded-full flex items-center justify-center flex-shrink-0">
                <i data-lucide="${isAnnouncement ? 'megaphone' : 'message-circle'}" class="w-4 h-4"></i>
            </div>
            <div class="min-w-0">
                <p class="font-semibold text-sm text-slate-800 truncate">${escapeHtml(ticket.subject)}</p>
                <p class="text-[10px] text-slate-400">${isAnnouncement ? 'Annonce' : 'Support'}${isClosed ? ' • Résolu' : ''}</p>
            </div>
        `;

        // Actions
        const isAdmin = store.state.profile?.is_admin && store.state.adminMode;
        if (isAdmin && ticketActions) {
            ticketActions.innerHTML = `
                <div class="flex items-center gap-1">
                    ${!isClosed ? `
                        <button id="btn-close-ticket" class="w-8 h-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full flex items-center justify-center transition" title="Résolu">
                            <i data-lucide="check" class="w-4 h-4"></i>
                        </button>
                    ` : ''}
                    <button id="btn-delete-ticket" class="w-8 h-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full flex items-center justify-center transition" title="Supprimer">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            ticketActions.classList.remove('hidden');
            createIcons({ icons, root: ticketActions });

            ticketActions.querySelector('#btn-close-ticket')?.addEventListener('click', () => handleCloseTicket(id));
            ticketActions.querySelector('#btn-delete-ticket')?.addEventListener('click', () => handleDeleteTicket(id));
        }

        createIcons({ icons, root: headerInfo });
    }

    renderMessages(msgContainer, messages);

    // Realtime
    realtimeSubscription = ChatService.subscribeToTicket(id, (newMessage) => {
        appendMessage(msgContainer, newMessage, true);
    });
}

function renderMessages(container, messages) {
    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="flex items-center justify-center h-full text-slate-300">
                <span class="text-sm">Aucun message</span>
            </div>
        `;
        return;
    }

    const currentUserId = store.state.user?.id;
    let html = '';
    let lastDate = '';
    let lastSenderId = '';
    let lastMinute = '';

    messages.forEach((msg, idx) => {
        const isMine = msg.user_id === currentUserId;
        const msgDate = new Date(msg.created_at);
        const dateStr = msgDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
        const timeStr = msgDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const minuteKey = `${msgDate.getHours()}:${msgDate.getMinutes()}`;

        // Date separator
        if (dateStr !== lastDate) {
            html += `<div class="text-center my-4"><span class="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-medium">${dateStr}</span></div>`;
            lastDate = dateStr;
            lastSenderId = '';
        }

        // Group messages from same sender within same minute
        const isGrouped = lastSenderId === msg.user_id && lastMinute === minuteKey;
        lastSenderId = msg.user_id;
        lastMinute = minuteKey;

        html += renderMessageBubble(msg, isMine, isGrouped, timeStr);
    });

    container.innerHTML = html;
    createIcons({ icons, root: container });
    container.scrollTop = container.scrollHeight;
}

function renderMessageBubble(msg, isMine, isGrouped, timeStr) {
    const senderName = msg.profiles ? `${msg.profiles.first_name || ''} ${msg.profiles.last_name || ''}`.trim() : '';
    const isAdmin = msg.profiles?.is_admin;

    if (isMine) {
        return `
            <div class="flex justify-end ${isGrouped ? 'mt-0.5' : 'mt-2'}">
                <div class="max-w-[75%] px-3 py-2 bg-brand-500 text-white rounded-2xl ${isGrouped ? 'rounded-tr-lg' : 'rounded-tr-sm'} shadow-sm">
                    <p class="text-[13px] leading-relaxed break-words">${escapeHtml(msg.content)}</p>
                    ${!isGrouped ? `<p class="text-[9px] text-brand-200 text-right mt-1">${timeStr}</p>` : ''}
                </div>
            </div>
        `;
    } else {
        return `
            <div class="flex justify-start ${isGrouped ? 'mt-0.5' : 'mt-2'}">
                <div class="max-w-[75%]">
                    ${!isGrouped && senderName ? `
                        <p class="text-[10px] text-slate-400 mb-0.5 ml-3 flex items-center gap-1">
                            ${senderName}
                            ${isAdmin ? '<span class="text-[8px] bg-amber-100 text-amber-600 px-1 rounded">Admin</span>' : ''}
                        </p>
                    ` : ''}
                    <div class="px-3 py-2 bg-white border border-slate-200 rounded-2xl ${isGrouped ? 'rounded-tl-lg' : 'rounded-tl-sm'} shadow-sm">
                        <p class="text-[13px] text-slate-700 leading-relaxed break-words">${escapeHtml(msg.content)}</p>
                        ${!isGrouped ? `<p class="text-[9px] text-slate-300 mt-1">${timeStr}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
}

function appendMessage(container, msg, scroll = false) {
    const currentUserId = store.state.user?.id;
    const isMine = msg.user_id === currentUserId;
    const timeStr = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const placeholder = container.querySelector('.text-slate-300');
    if (placeholder) placeholder.remove();

    const div = document.createElement('div');
    div.innerHTML = renderMessageBubble(msg, isMine, false, timeStr);
    container.appendChild(div.firstElementChild);

    if (scroll) {
        container.scrollTop = container.scrollHeight;
    }
}

async function handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('message-input');
    const content = input?.value.trim();

    if (!content || !currentTicketId) return;

    input.value = '';

    const res = await ChatService.sendMessage(currentTicketId, content);
    if (res.error) {
        showToast("Erreur envoi", "error");
        input.value = content;
    }
}

async function handleCloseTicket(id) {
    showConfirm("Marquer comme résolu ?", async () => {
        toggleLoader(true);
        const res = await ChatService.closeTicket(id);
        toggleLoader(false);

        if (res.error) showToast("Erreur", "error");
        else {
            showToast("Conversation résolue ✓");
            await loadTicketsList();
            await openTicket(id);
        }
    });
}

async function handleDeleteTicket(id) {
    showConfirm("Supprimer cette conversation ?", async () => {
        toggleLoader(true);
        const res = await ChatService.deleteTicket(id);
        toggleLoader(false);

        if (res.error) showToast("Erreur suppression", "error");
        else {
            showToast("Conversation supprimée");
            currentTicketId = null;
            document.getElementById('chat-list-panel')?.classList.remove('hidden');
            document.getElementById('chat-conversation-panel')?.classList.add('hidden', 'md:flex');
            await loadTicketsList();
        }
    }, { type: 'danger', confirmText: 'Supprimer' });
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Maintenant';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function cleanup() {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
        realtimeSubscription = null;
    }
}
